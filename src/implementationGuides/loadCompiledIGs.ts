/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import path from 'path';
import { existsSync, PathLike, readFileSync } from 'fs';

export const COMPILED_IGS_DIRECTORY = 'compiledImplementationGuides';

/**
 * Loads the compiled Implementation Guides for a given 'fhir-works-at-aws' module.
 * By default they are located on a file named "compiledImplementationGuides/<moduleName>.json"
 * @param moduleName
 * @param implementationGuidesPath - allows to override the path to the compiled Implementation Guides directory
 */
// eslint-disable-next-line import/prefer-default-export
export const loadImplementationGuides = (
    moduleName: string,
    implementationGuidesPath?: PathLike,
): any[] | undefined => {
    const resolvedImplementationGuidesPath =
        implementationGuidesPath ?? path.join(__dirname, '..', COMPILED_IGS_DIRECTORY);

    const igsPath = path.join(resolvedImplementationGuidesPath.toString(), `${moduleName}.json`);

    if (existsSync(igsPath)) {
        return JSON.parse(readFileSync(igsPath, { encoding: 'utf8' }));
    }
    return undefined;
};
