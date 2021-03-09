import { existsSync, PathLike, readdir, readFile, writeFile, realpathSync, statSync } from 'fs';
import util from 'util';
import path from 'path';
import { ImplementationGuides } from 'fhir-works-on-aws-interface';

/* eslint no-restricted-syntax: 0 */
/* eslint no-await-in-loop: 0 */
/* eslint class-methods-use-this: 0 */

const readFilePmd = util.promisify(readFile);
const readDirPmd = util.promisify(readdir);
const writeFilePmd = util.promisify(writeFile);

const BASE_FHIR_NAME = 'hl7.fhir.r4.core';

export async function loadJson(fileName: PathLike): Promise<any> {
    return JSON.parse(await readFilePmd(fileName, 'utf8'));
}

export async function storeJson(fileName: PathLike, data: any) {
    await writeFilePmd(fileName, JSON.stringify(data));
}

async function listIgDirs(parentDir: PathLike): Promise<string[]> {
    return (await readDirPmd(parentDir, { withFileTypes: true }))
        .filter(dirent => {
            return (
                dirent.isDirectory() ||
                (dirent.isSymbolicLink() &&
                    statSync(realpathSync(path.join(parentDir.toString(), dirent.name))).isDirectory())
            );
        })
        .map(dirent => {
            return path.join(parentDir.toString(), dirent.name);
        });
}

export interface IGCompilerOptions {
    ignoreVersion: boolean;
}

export interface IGInfo {
    id: string;
    name: string;
    version: string;
    url: string;
    path: string;
    dependencies: string[];
}

/**
 *  Helper class used for compiling Implementation Guides packages
 */
export class IGCompiler {
    private options: IGCompilerOptions;

    private readonly searchImplementationGuides: ImplementationGuides;

    private readonly structureDefinitionImplementationGuides: ImplementationGuides;

    constructor(
        searchImplementationGuides: ImplementationGuides,
        structureDefinitionImplementationGuides: ImplementationGuides,
        options: IGCompilerOptions,
    ) {
        this.searchImplementationGuides = searchImplementationGuides;
        this.structureDefinitionImplementationGuides = structureDefinitionImplementationGuides;
        this.options = options;
    }

    private async collectResources(
        igDir: PathLike,
        resourceType: 'SearchParameter' | 'StructureDefinition',
    ): Promise<any[]> {
        const indexJson = path.join(igDir.toString(), '.index.json');
        if (!existsSync(indexJson)) {
            throw new Error(`'.index.json' not found in ${igDir}`);
        }
        const index: any = await loadJson(indexJson);
        const resources = [];
        for (const file of index.files) {
            if (file.resourceType === resourceType) {
                const filePath = path.join(igDir.toString(), file.filename);
                console.log(`Compiling ${filePath}`);
                resources.push(await loadJson(filePath));
            }
        }
        return resources;
    }

    /**
     * Compiles the implementation guides packages located at `igsDir` and saves the results in `outputPath`
     *
     * This method delegates the compilation of specific resource types to the implementations of `ImplementationGuides.compile` from other fhir-works-on-aws modules.
     * @param igsDir
     * @param outputPath
     */
    public async compileIGs(igsDir: PathLike, outputPath: PathLike): Promise<void> {
        if (!existsSync(igsDir)) {
            throw new Error(`'${igsDir}' doesn't exist`);
        }
        const igInfos = await this.collectIGInfos(igsDir);
        this.validateDependencies(igInfos);

        const searchParams: any[] = [];
        const structureDefinitions: any[] = [];
        for (const igInfo of igInfos) {
            searchParams.push(...(await this.collectResources(igInfo.path, 'SearchParameter')));
            structureDefinitions.push(...(await this.collectResources(igInfo.path, 'StructureDefinition')));
        }
        const compiledSearchParams = await this.searchImplementationGuides.compile(searchParams);
        const compiledStructureDefinitions = await this.structureDefinitionImplementationGuides.compile(
            structureDefinitions,
        );

        await storeJson(path.join(outputPath.toString(), 'fhir-works-on-aws-search-es.json'), compiledSearchParams);
        await storeJson(
            path.join(outputPath.toString(), 'fhir-works-on-aws-routing.json'),
            compiledStructureDefinitions,
        );
    }

    private createIGKey(name: string, version: string) {
        if (this.options.ignoreVersion) {
            return name;
        }
        return `${name}@${version}`;
    }

    private async extractIgInfo(igDir: PathLike): Promise<IGInfo> {
        const packagePath = path.join(igDir.toString(), 'package.json');
        if (!existsSync(packagePath)) {
            throw new Error(`'package.json' not found in ${igDir}`);
        }
        console.log(`checking ${packagePath}`);
        const packageJson: any = await loadJson(packagePath);
        const dependencies: string[] = [];
        const igInfo = {
            id: this.createIGKey(packageJson.name, packageJson.version),
            url: packageJson.url,
            name: packageJson.name,
            version: packageJson.version,
            path: igDir.toString(),
            dependencies,
        };
        const packageDeps: { [key: string]: string } = packageJson.dependencies;
        if (packageDeps) {
            for (const [name, version] of Object.entries(packageDeps)) {
                const igId: string = this.createIGKey(name, version);
                dependencies.push(igId);
            }
        }
        return igInfo;
    }

    private async collectIGInfos(igsDir: PathLike): Promise<IGInfo[]> {
        const igInfos: IGInfo[] = [];
        for (const igPath of await listIgDirs(igsDir)) {
            console.log(`looking at ig path: ${igPath}`);
            const igInfo = await this.extractIgInfo(igPath);
            if (igInfo.name === BASE_FHIR_NAME) {
                console.log(
                    `Skipping ${BASE_FHIR_NAME} since the base FHIR definitions are already included in fhir-works-on-aws`,
                );
            } else {
                igInfos.push(igInfo);
            }
        }
        return igInfos;
    }

    private validateDependencies(igInfos: IGInfo[]): void {
        const parentMap: { [key: string]: string[] } = {};
        for (const igInfo of igInfos) {
            parentMap[igInfo.id] = igInfo.dependencies;
        }
        for (const igId of Object.keys(parentMap)) {
            this.depthFirst([igId], parentMap);
        }
    }

    private depthFirst(parents: string[], pMap: { [key: string]: string[] }): void {
        const igId = parents[parents.length - 1];
        const dependencies = pMap[igId];
        if (!dependencies) {
            throw new Error(`Missing dependency ${igId}`);
        }
        for (const parentId of dependencies) {
            if (parents.includes(parentId)) {
                throw new Error(`Circular dependency found: ${parents.join(' -> ')} -> ${parentId}`);
            }
            if (!parentId.startsWith(BASE_FHIR_NAME)) {
                parents.push(parentId);
                this.depthFirst(parents, pMap);
                parents.pop();
            }
        }
    }
}
