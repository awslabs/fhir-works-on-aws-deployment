import fs from 'fs';
/* eslint-disable import/no-extraneous-dependencies */
import _ from 'lodash';
import path from 'path';

/*
    Script to help auto-generate our FWoA postman collection for testing.
    Postman has a public collection for FHIR with most R4 resources here
    https://www.postman.com/api-evangelist/workspace/fast-healthcare-interoperability-resources-fhir/overview
    Examples from HL7 FHIR R4 downloads here
    https://www.hl7.org/fhir/examples-json.zip

    This script can take an export from the public FHIR collection, and 
    merge it with our definitions in ../postman

    `npx ts-node create-postman-collection.ts $your-public-collection-file $your-unziped-examples-dir $output-file`
    EG: npx ts-node ./scripts/create-postman-collection.ts ~/Downloads/FHIR.postman_collection.json ~/Downloads/examples-json /tmp/FHIR.fwoa_postman_collection.json
*/

const updateRequests = (item: any, auth: any, resourceName: string, examplesDir: string) => {
    if (item.request) {
        // add the auth
        /* eslint-disable no-param-reassign */
        item.request.auth = _.cloneDeep(auth);

        // add the x-api-key header
        if (!item.request.header) {
            /* eslint-disable no-param-reassign */
            item.request.header = [];
        }
        item.request.header.push({
            key: 'x-api-key',
            value: '{{API_KEY}}',
            type: 'text',
        });

        // update to {{API_URL}} from {{baseUrl}}
        /* eslint-disable no-param-reassign */
        item.request.url.raw = item.request.url.raw.replace('{{baseUrl}}', '{{API_URL}}');
        /* eslint-disable no-param-reassign */
        item.request.url.host = ['{{API_URL}}'];

        // add the example json as the body if we have it
        if (item.request.method === 'POST' || item.request.method === 'PUT') {
            // TODO: better probing logic here because the -example convention only gets most files
            // to get through, I renamed some files manually
            const exampleFilePath = path.join(examplesDir, `${resourceName}-example.json`);
            if (fs.existsSync(exampleFilePath)) {
                /* eslint-disable no-param-reassign */
                item.request.body.raw = fs.readFileSync(exampleFilePath, 'utf-8');
            } else {
                console.log(`no file found for ${resourceName} - ${exampleFilePath}`);
            }
        }
    }

    // remove the samples because they are more noise than anything
    if (item.response) {
        delete item.response;
    }

    if (item.item) {
        item.item.forEach((child: any) => {
            updateRequests(child, auth, resourceName, examplesDir);
        });
    }
};

(async () => {
    try {
        console.log("let's create this thang.");

        let publicCollectionPath = '';
        let outputCollectionPath = '';
        let examplesDir = '';
        if (process.argv.length < 5) {
            console.log('please pass in the file paths to your public FHIR collection, examples dir and output file');
            process.exit(1);
        }
        [, , publicCollectionPath, examplesDir, outputCollectionPath] = process.argv;

        // parse the public collection
        console.log(`parsing public FHIR postman collection, ${publicCollectionPath}`);
        const publicFHIRContents = await fs.promises.readFile(publicCollectionPath, 'utf-8');
        const publicCollection = JSON.parse(publicFHIRContents);
        console.log('parsing complete');

        // load our collection
        console.log('parsing fwoa postman collection');
        const fwoaCollectionContents = await fs.promises.readFile(
            `${__dirname}/../postman/Fhir.postman_collection.json`,
            'utf-8',
        );
        const fwoaCollection = JSON.parse(fwoaCollectionContents);
        console.log('parsing complete');

        if (!fwoaCollection.item || fwoaCollection.item.length === 0) {
            console.log('fwoa postman collection does not have any items defined');
            process.exit(1);
        }

        // pluck out the auth from an existing route
        const fwoaAuthItem = _.find(fwoaCollection.item, item => {
            return item.item?.[0].request?.auth?.type !== 'noauth';
        });
        if (_.isUndefined(fwoaAuthItem)) {
            console.log('fwoa postman collection does not have any requests defined');
            process.exit(1);
        }
        console.log(`found fwoa auth`);
        const { auth } = fwoaAuthItem.item[0].request;

        // alright, alright, alright let's add any missing items to fwoa collection
        publicCollection.item.forEach((item: any) => {
            const resourceName = item.name
                .split(' ')
                .join('')
                .toLowerCase();

            const fwoaItem = _.find(fwoaCollection.item, i => {
                return i.name === item.name;
            });
            if (_.isUndefined(fwoaItem)) {
                // new item just add after updates
                const newItem = _.cloneDeep(item);

                updateRequests(newItem, auth, resourceName, examplesDir);

                fwoaCollection.item.push(newItem);
            } else {
                // TODO: go recursive here and pickup any public requests that
                // are not already in fwoa collection. We'll need to add logic
                // to updateRequests to check the current public recursed item
                // against fwoa in the same node level
            }
        });

        // sort the resources by name
        fwoaCollection.item.sort((a: any, b: any) => {
            const isADir = !_.has(a, 'request');
            const isBDir = !_.has(b, 'request');

            if (isADir && isBDir) {
                return a.name.localeCompare(b.name);
            }
            if (isADir && !isBDir) {
                return 1;
            }
            if (!isADir && isBDir) {
                return -1;
            }
            return a.name.localeCompare(b.name);
        });

        await fs.promises.writeFile(outputCollectionPath, JSON.stringify(fwoaCollection, null, 2));

        console.log('created new postman collection for fwoa');
    } catch (err) {
        console.log('Errors gumming up the works.');
        console.log(err);
        process.exit(1);
    }
})();
