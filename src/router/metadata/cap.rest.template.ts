/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { SystemOperation } from '../../interface/constants';
import { makeOperation } from './cap.rest.resource.template';

export default function makeRest(resource: any[], security: any, globalOperations: SystemOperation[]) {
    const rest: any = {
        mode: 'server',
        documentation: 'Main FHIR endpoint',
        security,
        resource,
        interaction: makeOperation(globalOperations),
    };

    if (globalOperations.includes('search-system')) {
        rest.searchParam = [
            {
                name: 'ALL',
                type: 'composite',
                documentation: 'Support all fields.',
            },
        ];
    }
    return rest;
}
