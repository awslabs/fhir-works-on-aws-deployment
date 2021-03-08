import yargs from 'yargs';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { SearchImplementationGuides } from 'fhir-works-on-aws-search-es';
import { StructureDefinitionImplementationGuides } from 'fhir-works-on-aws-routing/lib/implementationGuides';
import { IGCompiler } from '../src/implementationGuides/IGCompiler';
import { COMPILED_IGS_DIRECTORY } from '../src/implementationGuides/loadCompiledIGs';

const PROJECT_DIR = join(__dirname, '..');

function parseCmdOptions() {
    return yargs(process.argv.slice(2))
        .usage('Usage: $0 [--ignoreVersion, -i ] [--igPath, -p IG pack directory] [--outputDir, -o output ]')
        .describe('ignoreVersion', "Don't care whether version of dependency lines up with version of installed IG")
        .boolean('ignoreVersion')
        .default('ignoreVersion', false)
        .alias('i', 'ignoreVersion')
        .describe('igPath', 'Path to folder with IG pack sub folders')
        .default('igPath', join(PROJECT_DIR, 'implementationGuides/'))
        .alias('p', 'igPath')
        .describe('outputDir', 'Path to compiled output JSON file')
        .alias('o', 'outputDir')
        .default('outputDir', join(PROJECT_DIR, COMPILED_IGS_DIRECTORY)).argv;
}

/**
 * main function of the script
 * parse command line arguments and invoke compiler
 * */
async function compileIGs() {
    const cmdArgs = parseCmdOptions();
    const options = {
        ignoreVersion: cmdArgs.ignoreVersion,
    };
    if (!existsSync(cmdArgs.igPath)) {
        console.log(`IGs folder '${cmdArgs.igPath}' does not exist. No IGs found, exiting...`);
        return;
    }
    const compiledIgsDir = cmdArgs.outputDir.toString();
    if (!existsSync(compiledIgsDir)) {
        console.log(`folder for compiled IGs '${compiledIgsDir}' does not exist, creating it`);
        mkdirSync(compiledIgsDir, { recursive: true });
    }

    try {
        await new IGCompiler(
            SearchImplementationGuides,
            new StructureDefinitionImplementationGuides(),
            options,
        ).compileIGs(cmdArgs.igPath, cmdArgs.outputDir);
    } catch (ex) {
        console.error('Exception: ', ex.message, ex.stack);
    }
}

compileIGs();
