/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class OperationsGenerator {
    static generateResourceNotFoundError(resourceType: string, id: string) {
        const diagnosticMessage = `Resource ${resourceType}/${id} is not known`;
        return this.generateError(diagnosticMessage);
    }

    static generateHistoricResourceNotFoundError(resourceType: string, id: string, vid: string) {
        const diagnosticMessage = `Version "${vid}" is not valid for resource ${resourceType}/${id}`;
        return this.generateError(diagnosticMessage);
    }

    static generateProcessingError(divErrorMessage: string, diagnosticMessage: string) {
        const result = {
            resourceType: 'OperationOutcome',
            text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">ERROR</td><td>[]</td><td><pre>${divErrorMessage}</pre></td></tr></table></div>`,
            },
            issue: [
                {
                    severity: 'error',
                    code: 'processing',
                    diagnostics: diagnosticMessage,
                },
            ],
        };

        return result;
    }

    static generatInputValidationError(validationError: string) {
        const diagnosticMessage = `Failed to parse request body as JSON resource. Error was: ${validationError}`;
        return this.generateError(diagnosticMessage);
    }

    static generateUpdateResourceIdsNotMatching(urlId: string, resourceId: string) {
        const errorMessage = `Can not update resource with ID[${urlId}], while the given request payload has an ID[${resourceId}]`;
        return this.generateError(errorMessage);
    }

    static generateError(errorMessage: string) {
        return this.generateProcessingError(errorMessage, errorMessage);
    }

    static generateSuccessfulDeleteOperation(count = 1) {
        return {
            resourceType: 'OperationOutcome',
            text: {
                status: 'generated',
                div: `<div xmlns="http://www.w3.org/1999/xhtml"><h1>Operation Outcome</h1><table border="0"><tr><td style="font-weight: bold;">INFORMATION</td><td>[]</td><td><pre>Successfully deleted ${count} resource</pre></td></tr></table></div>`,
            },
            issue: [
                {
                    severity: 'information',
                    code: 'informational',
                    diagnostics: `Successfully deleted ${count} resource`,
                },
            ],
        };
    }
}
