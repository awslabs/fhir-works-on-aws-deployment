/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 *
 */

import { getSearchMappings, SearchMappingsManager } from 'fhir-works-on-aws-search-es';
import axios from 'axios';
import { fhirVersion } from '../src/config';

const sendCfnResponse = async (event: any, status: 'SUCCESS' | 'FAILED', error?: Error) => {
    if (error !== undefined) {
        console.log(error);
    }
    const responseBody = JSON.stringify({
        Status: status,
        Reason: error?.message,
        // The value of PhysicalResourceId doesn't really matter in this case.
        // It just needs to be the same string on all responses to indicate that it is the same resource.
        PhysicalResourceId: 'searchMappings',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId,
    });
    console.log(`Sending response to CFN: ${responseBody}`);
    await axios.put(event.ResponseURL, responseBody);
};

/**
 * Custom resource lambda handler that creates or updates the search mappings.
 * Custom resource spec: See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/template-custom-resources.html
 * @param event Custom resource request event. See https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/crpg-ref-requests.html
 */
exports.handler = async (event: any) => {
    console.log(event);
    try {
        if (process.env.ELASTICSEARCH_DOMAIN_ENDPOINT === undefined) {
            throw new Error('Missing required env variable ELASTICSEARCH_DOMAIN_ENDPOINT');
        }

        if (process.env.NUMBER_OF_SHARDS === undefined) {
            throw new Error('Missing required env variable NUMBER_OF_SHARDS');
        }

        const numberOfShards = Number.parseInt(process.env.NUMBER_OF_SHARDS, 10);
        if (Number.isNaN(numberOfShards)) {
            throw new Error('NUMBER_OF_SHARDS env variable is not a number');
        }

        const searchMappingsManager = new SearchMappingsManager({
            numberOfShards,
            searchMappings: getSearchMappings(fhirVersion),
            ignoreMappingsErrorsForExistingIndices: true,
        });

        switch (event.RequestType as any) {
            case 'Create':
            case 'Update':
                await searchMappingsManager.createOrUpdateMappings();
                await sendCfnResponse(event, 'SUCCESS');
                break;
            case 'Delete':
                console.log('Received Delete event. Doing nothing');
                await sendCfnResponse(event, 'SUCCESS');
                break;
            default:
                // This should never happen
                await sendCfnResponse(
                    event,
                    'FAILED',
                    new Error(`Unknown event.RequestType value: ${event.RequestType}`),
                );
                break;
        }
    } catch (e) {
        await sendCfnResponse(event, 'FAILED', e as Error);
    }
};
