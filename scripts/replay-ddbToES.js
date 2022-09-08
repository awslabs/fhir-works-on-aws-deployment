import { DynamoDBClient, paginateScan } from "@aws-sdk/client-dynamodb";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import _ from 'lodash';

/*
    Script to replay dynamodb documents to the ddbToES lambda. Best effort to only send the last version
    This script is useful when an OpenSearch cluster has been corrupt, failed or migrating to a new cluster.

    The script is relatively limited in that it's a single process, does not support resumption and can be logically
    inaccurate if the system is receiving real workloads. So, this is useful for small to medium size implementations
    DR/migration scenarios. For a point of reference, we've seen a codebuild small ARM instance replay ~1m dynamodb
    documents to ElasticSearch per hour with a SEGMENT_COUNT=15 and SCAN_PAGE_LIMIT=300 in a FWoA `dev` stage deployment.
    The throughput of the script is initially bound by the write throughput of the ElasticSearch cluster. However, at some
    point that will switch from ElasticSearch write throughput to DynamoDB read throughput.

    Low hanging fruit improvements would be to decouple the dynamodb reads from the ElasticSearch writes. An in-memory queue
    could be used to let the readers buffer dynamodb documents until there is back pressure from the ElasticSearch writers.
    Care would need to be taken to make sure there's a steady state of memory so we don't throw an OOM error and crash.

    Long term, support for large datasets will require being able to horizontally scale the synchronization process. The
    hard challenge here will be finding a way to gurantee that the last vid per id is written last. This script does the
    guaranteeing of the last vid is always written last by using a shared idToGreatestVid and tossing any documents with a
    smaller vid than the greatest known vid per id. To the best of our knowledge, there is not guarantees in dynamodb paging
    segments to receive all shard keys in a single segment. Therefore, some shared state would be needed across nodes to synchronize
    the greatest vid.

    setup
    ------
    dirName=$RANDOM
    dirPath="/tmp/${dirName}/"
    mkdir -p "${dirPath}"
    cp scripts/replay-ddbToES.js "${dirPath}"
    cd "${dirPath}"
    npm init -y
    echo $(cat package.json | jq '. += {"type":"module"}') > package.json
    npm install @aws-sdk/client-dynamodb@3.154.0
    npm install @aws-sdk/client-lambda@3.154.0
    npm install lodash@4.17.21

    run
    -------
    AWS_REGION="<my-region>" \
    AWS_PROFILE="<my-profile>" \
    SEGMENT_COUNT="3" \
    SCAN_PAGE_LIMIT="90" \
    TABLE_NAME="resource-db-dev" \
    DDB_TO_ES_LAMBDA_ARN="<my-ddbToES-arn>" \
    node --max-old-space-size=8192 replay-ddbToES.js
*/

const dynamodbClient = new DynamoDBClient();
const lambdaClient = new LambdaClient();
const SEGMENT_COUNT = parseInt(process.env.SEGMENT_COUNT);
const TABLE_NAME = process.env.TABLE_NAME;
const DDB_TO_ES_LAMBDA_ARN = process.env.DDB_TO_ES_LAMBDA_ARN;
const SCAN_PAGE_LIMIT = parseInt(process.env.SCAN_PAGE_LIMIT); // 6x concurrent invokes/per segment
const idToGreatestVid = new Map();

(async () => {
    try {
        
        const workerPromises = _.range(0, SEGMENT_COUNT).map((segment)=>{
            return new Promise(async (resolve, reject)=>{
                try {
                    const paginator = paginateScan({
                        client: dynamodbClient,
                        pageSize: SCAN_PAGE_LIMIT
                    }, {
                        TableName: TABLE_NAME,
                        Segment: segment,
                        TotalSegments: SEGMENT_COUNT,
                        Limit: SCAN_PAGE_LIMIT 
                    });
                    let i = 0;
                    const logSize = SCAN_PAGE_LIMIT * 100;
                    for await (const page of paginator){
                        // find the greatest vid per id in this page
                        const itemsIdToVid = {};
                        _.reduce(
                            _.groupBy(page.Items, 'id.S'),
                            (result, value, key)=>{
                                result[key] = parseInt(value.sort((a, b)=>{
                                    return parseInt(a.vid.N) - parseInt(b.vid.N);
                                })[0].vid.N);

                                return result;
                            },
                            itemsIdToVid
                        );

                        // update our global 
                        _.keys(itemsIdToVid).forEach((key)=>{
                            const entry = idToGreatestVid.get(key);
                            if (entry !== undefined){
                                if (entry < itemsIdToVid[key]){
                                    idToGreatestVid.set(key, itemsIdToVid[key]);
                                }
                            } else {
                                idToGreatestVid.set(key, itemsIdToVid[key]);
                            }
                        });

                        const items = page.Items.filter((item)=>{
                            // best effort to filter out any writes < the last vid
                            return idToGreatestVid.get(item.id.S) <= parseInt(item.vid.N);
                        }).map((item)=>{
                            // project to a ddb stream payload
                            return {
                                eventName: 'INSERT',
                                dynamodb: {
                                    Keys: {
                                        id: {
                                            S: item.id.S
                                        },
                                        vid: {
                                            N: item.vid.N
                                        }
                                    },
                                    NewImage: item
                                }
                            }
                        });

                        // chunk by 15 since that's the max number of items for ddbToES lambda trigger
                        const chunks = _.chunk(items, 15);

                        // invoke the ddbToES lambda
                        const sendPromises = chunks.map((chunk)=>{
                            const invokeRequest = new InvokeCommand({
                                Payload: JSON.stringify({Records:chunk}),
                                FunctionName: DDB_TO_ES_LAMBDA_ARN,
                                InvocationType: 'RequestResponse',
                            });
                            
                            // bombs away
                            return lambdaClient.send(invokeRequest);
                        });

                        await Promise.all(sendPromises);

                        if (i % logSize === 0){
                            console.log(`\tfinished ${logSize} documents in segment ${segment}`);
                        }
                    }

                    resolve();
                } catch (err){
                    console.log('error processing a page of scanned records');
                    console.error(err);

                    reject(err);
                }
            });

        });

        console.log('starting to sync data from dynamodb to opensearch');
        
        // start the various workers
        await Promise.all(workerPromises);

        console.log('successfully syncd data from dynamodb to opensearch');
    } catch (err){
        console.log('Errors gumming up the works.');
        console.error(err);
        process.exit(1);
    }
})();