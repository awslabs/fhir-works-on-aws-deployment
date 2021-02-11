import { join, dirname } from 'path';
import yargs from 'yargs';
import { SearchImplementationGuides } from 'fhir-works-on-aws-search-es';
import { existsSync, mkdirSync } from 'fs';
import { IGCompiler } from '../src/implementationGuides/IGCompiler';

const PROJECT_DIR = join(__dirname, '..');

function parseCmdOptions() {
    return yargs(process.argv.slice(2))
        .usage('Usage: $0 [--ignoreVersion, -i ] [--igPath, -p IG pack directory] [--outputFile, -o output ]')
        .describe('ignoreVersion', "Don't care whether version of dependency lines up with version of installed IG")
        .boolean('ignoreVersion')
        .default('ignoreVersion', false)
        .alias('i', 'ignoreVersion')
        .describe('igPath', 'Path to folder with IG pack sub folders')
        .default('igPath', join(PROJECT_DIR, 'implementationGuides/'))
        .alias('p', 'igPath')
        .describe('outputFile', 'Path to compiled output JSON file')
        .alias('o', 'outputFile')
        .default('outputFile', join(PROJECT_DIR, 'compiledImplementationGuides/fhir-works-on-aws-search-es.json')).argv;
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
    const compiledIgsDir = dirname(cmdArgs.outputFile);
    if (!existsSync(compiledIgsDir)) {
        console.log(`folder for compiled IGs '${compiledIgsDir}' does not exist, creating it`);
        mkdirSync(compiledIgsDir, { recursive: true });
    }

    try {
        await new IGCompiler(SearchImplementationGuides, options).compileIGs(cmdArgs.igPath, cmdArgs.outputFile);
    } catch (ex) {
        console.error('Exception: ', ex.message, ex.stack);
    }
}

compileIGs();
