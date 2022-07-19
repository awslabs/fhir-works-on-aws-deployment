var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');

// expected usage: `node build_lambda.js <path> <path> <pathToFile> <fileName>`
// for use with NodeJsFunction command hooks to add files to Lambda functions,
// so <path> <path> will usually be the inputDir and outputDir variables, respectively
var inputDir = process.argv[2];
var outputDir = process.argv[3];
var fileToMove = process.argv[4];
var isDirectory = process.argv.length > 5 ? true : false;

function ensureDirectoryExistence(filePath) {
    var dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    fs.mkdirSync(dirname, { recursive: true });
}

if (isDirectory) {
    fse.copySync(inputDir, outputDir);
} else {
    ensureDirectoryExistence(`${outputDir}/${fileToMove}`);
    fs.copyFileSync(`${inputDir}/${fileToMove}`, `${outputDir}/${fileToMove}`);
}