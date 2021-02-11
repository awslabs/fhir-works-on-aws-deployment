/* 
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the ESLint parser
    extends: [
        'airbnb-base',
        'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
    ],
    plugins: ['@typescript-eslint'],
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
    },
    rules: {
        'import/extensions': ['error', 'ignorePackages', { ts: 'never' }],
        'no-console': ['warn', { allow: ['log', 'error'] }],
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': 'error',
        'no-useless-constructor': 'off',
        '@typescript-eslint/no-useless-constructor': 'error',
        'no-empty-function': 'off',
        '@typescript-eslint/no-empty-function': 'error',
        'import/no-extraneous-dependencies': ['error', {'devDependencies': ['**/*.test.ts', 'integration-tests/*']}],
        'no-shadow': 'off', // replaced by ts-eslint rule below
        '@typescript-eslint/no-shadow': 'error'
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.ts'],
            },
        },
    },
    env: {
        jest: true,
    },
};
