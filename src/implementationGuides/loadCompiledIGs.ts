/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { existsSync, readFileSync } from 'fs';

const COMPILED_IGS_DIRECTORY = 'compiledImplementationGuides';

// eslint-disable-next-line import/prefer-default-export
export const loadImplementationGuides = (moduleName: string): any[] | undefined => {
    const implementationGuidesPath = path.join(__dirname, '..', '..', COMPILED_IGS_DIRECTORY);
    const searchIgsPath = path.join(implementationGuidesPath, `${moduleName}.json`);

    if (existsSync(searchIgsPath)) {
        return JSON.parse(readFileSync(searchIgsPath, { encoding: 'utf8' }));
    }
    return undefined;
};
