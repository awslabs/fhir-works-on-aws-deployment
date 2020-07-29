/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig } from '../src/interface/fhirConfig';
import stubs from '../src/stubs';

const config: FhirConfig = {
    orgName: 'Organization Name',
    auth: {
        strategy: {},
        authorization: stubs.passThroughAuthz,
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'error',
    },
    profile: {
        version: '4.0.1',
        systemOperations: [],
        bundle: stubs.bundle,
        systemSearch: stubs.search,
        systemHistory: stubs.history,
        genericResource: {
            operations: ['create', 'read', 'update', 'delete', 'vread', 'history-instance'],
            versions: ['4.0.1'],
            persistence: stubs.persistence,
            typeSearch: stubs.search,
            typeHistory: stubs.history,
        },
    },
};

export default config;
