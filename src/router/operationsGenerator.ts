/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export default class OperationsGenerator {
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
