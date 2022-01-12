/* 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
    semi: true,
    trailingComma: 'all',
    singleQuote: true,
    printWidth: 120,
    tabWidth: 4,
    overrides: [
        {
            files: ['*.yml', '*.yaml', '*.json', '*.md'],
            options: {
                tabWidth: 2,
            },
        },
    ],
};
