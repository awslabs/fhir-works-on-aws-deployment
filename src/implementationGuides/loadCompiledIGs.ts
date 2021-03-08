/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { existsSync, PathLike, readFileSync } from 'fs';

export const COMPILED_IGS_DIRECTORY = 'compiledImplementationGuides';

// eslint-disable-next-line import/prefer-default-export
export const loadImplementationGuides = (moduleName: string, implementationGuidesPath?: PathLike): any[] | undefined => {
    if ( implementationGuidesPath === undefined) {
        implementationGuidesPath = path.join(__dirname, '..', '..', COMPILED_IGS_DIRECTORY);
    }
    const igsPath = path.join(implementationGuidesPath.toString(), `${moduleName}.json`);

    if (existsSync(igsPath)) {
        return JSON.parse(readFileSync(igsPath, { encoding: 'utf8' }));
    }
    return undefined;
};
