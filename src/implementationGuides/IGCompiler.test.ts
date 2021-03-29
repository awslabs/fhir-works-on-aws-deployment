/* eslint no-restricted-syntax: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint class-methods-use-this: 0 */

import { dir, DirectoryResult } from 'tmp-promise';
import { join } from 'path';
import { existsSync, mkdirSync, PathLike } from 'fs';
import { ImplementationGuides } from 'fhir-works-on-aws-interface';
import { IGCompiler, IGCompilerOptions, loadJson, storeJson } from './IGCompiler';

class MockImplementationGuides implements ImplementationGuides {
    compile(input: any[]): Promise<any> {
        return Promise.resolve({
            input,
        });
    }
}

interface IGVersion {
    version: string;
    deps: string[];
}

describe('IGCompiler tests', () => {
    let workDir: DirectoryResult;
    let igsDir: PathLike;
    let outputDir: string;

    async function createIGs(options: IGCompilerOptions, igs: { [key: string]: IGVersion }) {
        for (const [igName, igInfo] of Object.entries(igs)) {
            const igPath = join(igsDir.toString(), igName);
            mkdirSync(igPath);
            await storeJson(join(igPath, 'searchParam1.json'), { igName, name: 'param1' });
            await storeJson(join(igPath, 'searchParam2.json'), { igName, name: 'param2' });
            await storeJson(join(igPath, 'structureDefinition1.json'), { igName, name: 'structureDefinition1' });
            const indexJson = {
                files: [
                    {
                        resourceType: 'SearchParameter',
                        filename: 'searchParam1.json',
                    },
                    {
                        resourceType: 'SearchParameter',
                        filename: 'searchParam2.json',
                    },
                    {
                        resourceType: 'ValueSet',
                        filename: 'valueSet1.json',
                    },
                    {
                        resourceType: 'StructureDefinition',
                        filename: 'structureDefinition1.json',
                    },
                ],
            };
            await storeJson(join(igPath, '.index.json'), indexJson);
            const dependencies: { [key: string]: string } = {};
            igInfo.deps.forEach((value: string) => {
                const [depName, version] = value.split('@');
                dependencies[depName] = version;
            });
            await storeJson(join(igPath, 'package.json'), {
                name: igName,
                version: igInfo.version,
                url: `http://http://hl7.org/fhir/${igName}`,
                dependencies,
            });
        }
        const implementationGuides = new MockImplementationGuides();
        const igCompiler = new IGCompiler(implementationGuides, implementationGuides, options);
        console.log('Done creating IGs');
        return igCompiler;
    }

    beforeEach(async () => {
        workDir = await dir({ unsafeCleanup: true });
        igsDir = join(workDir.path, 'igs');
        mkdirSync(igsDir);
        outputDir = join(workDir.path, 'output');
        mkdirSync(outputDir);
        console.log('before each');
    });

    afterEach(async () => {
        console.log('cleaning up');
        await workDir.cleanup();
    });

    it('compile a few IGs', async () => {
        const options: IGCompilerOptions = {
            ignoreVersion: true,
        };
        const igCompiler = await createIGs(options, {
            'hl7.fhir.us.carin-bb': {
                version: '1.0.0',
                deps: ['hl7.fhir.r4.core@4.0.1', 'hl7.fhir.us.core@3.1.0'],
            },
            'hl7.fhir.us.core': {
                version: '3.1.0',
                deps: ['hl7.fhir.r4.core@4.0.1'],
            },
            'hl7.fhir.us.davinci-pdex-plan-net': {
                version: '1.0.0',
                deps: ['hl7.fhir.us.carin-bb@0.1.0'],
            },
            'us.nlm.vsac': {
                version: '0.3.0',
                deps: ['hl7.fhir.us.core@3.1.0'],
            },
        });
        await igCompiler.compileIGs(igsDir, outputDir);
        expect(existsSync(outputDir)).toEqual(true);
        expect(await loadJson(join(outputDir, 'fhir-works-on-aws-search-es.json'))).toEqual({
            input: [
                {
                    igName: 'hl7.fhir.us.carin-bb',
                    name: 'param1',
                },
                {
                    igName: 'hl7.fhir.us.carin-bb',
                    name: 'param2',
                },
                {
                    igName: 'hl7.fhir.us.core',
                    name: 'param1',
                },
                {
                    igName: 'hl7.fhir.us.core',
                    name: 'param2',
                },
                {
                    igName: 'hl7.fhir.us.davinci-pdex-plan-net',
                    name: 'param1',
                },
                {
                    igName: 'hl7.fhir.us.davinci-pdex-plan-net',
                    name: 'param2',
                },
                {
                    igName: 'us.nlm.vsac',
                    name: 'param1',
                },
                {
                    igName: 'us.nlm.vsac',
                    name: 'param2',
                },
            ],
        });

        expect(await loadJson(join(outputDir, 'fhir-works-on-aws-routing.json'))).toEqual({
            input: [
                { igName: 'hl7.fhir.us.carin-bb', name: 'structureDefinition1' },
                { igName: 'hl7.fhir.us.core', name: 'structureDefinition1' },
                { igName: 'hl7.fhir.us.davinci-pdex-plan-net', name: 'structureDefinition1' },
                { igName: 'us.nlm.vsac', name: 'structureDefinition1' },
            ],
        });
    });

    it('missing dependencies', async () => {
        const options: IGCompilerOptions = {
            ignoreVersion: false,
        };
        const igCompiler = await createIGs(options, {
            'hl7.fhir.us.carin-bb': {
                version: '1.0.0',
                deps: ['hl7.fhir.r4.core@4.0.1', 'hl7.fhir.us.core@3.1.0'],
            },
            'hl7.fhir.us.core': {
                version: '3.1.0',
                deps: ['hl7.fhir.r4.core@4.0.1', 'us.nlm.vsac@0.3.0'],
            },
        });
        await expect(igCompiler.compileIGs(igsDir, outputDir)).rejects.toThrow('Missing dependency us.nlm.vsac@0.3.0');
    });

    it('circular dependencies', async () => {
        const options: IGCompilerOptions = {
            ignoreVersion: false,
        };
        const igCompiler = await createIGs(options, {
            'hl7.fhir.r4.core': {
                version: '4.0.1',
                deps: [],
            },
            'hl7.fhir.us.carin-bb': {
                version: '1.0.0',
                deps: ['hl7.fhir.r4.core@4.0.1', 'hl7.fhir.us.core@3.1.0'],
            },
            'hl7.fhir.us.core': {
                version: '3.1.0',
                deps: ['hl7.fhir.r4.core@4.0.1', 'us.nlm.vsac@0.3.0'],
            },
            'hl7.fhir.us.davinci-pdex-plan-net': {
                version: '1.0.0',
                deps: ['hl7.fhir.us.carin-bb@1.0.0'],
            },
            'us.nlm.vsac': {
                version: '0.3.0',
                deps: ['hl7.fhir.us.core@3.1.0', 'hl7.fhir.us.davinci-pdex-plan-net@1.0.0'],
            },
        });
        await expect(igCompiler.compileIGs(igsDir, outputDir)).rejects.toThrow(
            'Circular dependency found: hl7.fhir.us.carin-bb@1.0.0 -> hl7.fhir.us.core@3.1.0 -> us.nlm.vsac@0.3.0 -> hl7.fhir.us.core@3.1.0',
        );
    });
});
