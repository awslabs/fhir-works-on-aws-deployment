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
 *  Helper class used for compiling IGs. Its main functions are:
 *  - Looks through a folder of IG packs
 *  - Make sure no dependencies are missing
 *  - and there are no circular dependencies
 *  - calls compile function for each SearchParameters
 *
 */
export class IGCompiler {
    private options: IGCompilerOptions;

    private readonly implementationGuides: ImplementationGuides;

    constructor(implementationGuides: ImplementationGuides, options: IGCompilerOptions) {
        this.options = options;
        this.implementationGuides = implementationGuides;
    }

    async collectResources(igDir: PathLike): Promise<any[]> {
        const indexJson = path.join(igDir.toString(), '.index.json');
        if (!existsSync(indexJson)) {
            throw new Error(`'.index.json' not found in ${igDir}`);
        }
        const index: any = await loadJson(indexJson);
        const resources = [];
        for (const file of index.files) {
            if (file.resourceType === 'SearchParameter') {
                const filePath = path.join(igDir.toString(), file.filename);
                console.log(`Compiling ${filePath}`);
                resources.push(await loadJson(filePath));
            }
        }
        return resources;
    }

    /**
     * Main public function
     * @param igsDir
     * @param outputPath
     */
    public async compileIGs(igsDir: PathLike, outputPath: PathLike): Promise<void> {
        if (!existsSync(igsDir)) {
            throw new Error(`'${igsDir}' doesn't exist`);
        }
        const igInfos = await this.collectIGInfos(igsDir);
        this.validateDependencies(igInfos);
        const resources: any[] = [];
        for (const igInfo of igInfos) {
            resources.push(...(await this.collectResources(igInfo.path)));
        }
        const compiledResources = await this.implementationGuides.compile(resources);
        await storeJson(outputPath, compiledResources);
    }

    createIGKey(name: string, version: string) {
        if (this.options.ignoreVersion) {
            return name;
        }
        return `${name}@${version}`;
    }

    async extractIgInfo(igDir: PathLike): Promise<IGInfo> {
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

    async collectIGInfos(igsDir: PathLike): Promise<IGInfo[]> {
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

    validateDependencies(igInfos: IGInfo[]): void {
        const parentMap: { [key: string]: string[] } = {};
        for (const igInfo of igInfos) {
            parentMap[igInfo.id] = igInfo.dependencies;
        }
        for (const igId of Object.keys(parentMap)) {
            this.depthFirst([igId], parentMap);
        }
    }

    depthFirst(parents: string[], pMap: { [key: string]: string[] }): void {
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
