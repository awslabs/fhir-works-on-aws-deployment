/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { FhirConfig } from '../src/interface/fhirConfig';
import stubs from '../src/stubs';

const config: FhirConfig = {
    configVersion: 1,
    orgName: 'Organization Name',
    auth: {
        strategy: {
            service: 'Basic',
        },
        authorization: stubs.passThroughAuthz,
    },
    server: {
        url: 'http://example.com',
    },
    logging: {
        level: 'warn',
    },
    profile: {
        fhirVersion: '4.0.1',
        systemOperations: ['search-system', 'batch', 'history-system'],
        bundle: stubs.bundle,
        systemSearch: stubs.search,
        systemHistory: stubs.history,
        resources: {
            AllergyIntolerance: {
                operations: ['create', 'update'],
                fhirVersions: ['3.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Organization: {
                operations: ['create', 'update', 'patch'],
                fhirVersions: ['3.0.1', '4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Account: {
                operations: ['create', 'update'],
                fhirVersions: ['4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
            Patient: {
                operations: ['create', 'update', 'search-type'],
                fhirVersions: ['4.0.1'],
                persistence: stubs.persistence,
                typeSearch: stubs.search,
                typeHistory: stubs.history,
            },
        },
    },
};

export default config;
