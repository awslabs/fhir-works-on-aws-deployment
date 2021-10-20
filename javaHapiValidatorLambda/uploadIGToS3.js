/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */
'use strict';

const fs = require('fs');
const AWS = require('aws-sdk');
const axios = require('axios');

if (process.argv[2] === undefined) {
    console.error("No region specified!")
    process.exit(1);
}
console.log(process.argv[2]);
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.argv[2]
});
const bucketName = 'fhir-service-validator-implementationguides';
// /*
//     Returns all `fileType` files in specified `directory` and sub-directories.
// */
const getFilesInDir = (directory, fileType, fileNamesAndPath) => {
    if (!fs.existsSync(directory)) {
        throw new Error(`directory not found: ${directory}`);
    }

    const files = fs.readdirSync(directory);
    let filePath = ``;
    for (let i = 0; i < files.length; i += 1) {
        filePath = `${directory}/${files[i]}`;
        if (fs.statSync(filePath).isDirectory()) {
            fileNamesAndPath = getFilesInDir(filePath, 'json', fileNamesAndPath);
        } else if (files[i].endsWith(fileType)) {
            const fileObj = { path: filePath, filename: files[i] };
            fileNamesAndPath.push(fileObj);
        }
    }
    return fileNamesAndPath;
};

function uploadFile(fileNameAndPath) {
    const fileContent = String(fs.readFileSync(fileNameAndPath.path));
    // remove the '../' from the path to allow S3 to parse path information.
    fileNameAndPath.path = fileNameAndPath.path.substring(3);
    
    const fileUploadInfo = {
        Bucket: bucketName,
        Key: fileNameAndPath.path,
        Body: fileContent
    };
    
    return new Promise((resolve, reject) => {
        s3.upload(fileUploadInfo, function(err, data) {
            if (err) {
                console.error("Error: ", err);
                process.exit(1);
                reject();
            }
            console.log(`File Uploaded successfully. ${data.Location}`);
            resolve();
        });
    })
}

async function uploadAllFiles (callback) {
    const allFiles = getFilesInDir('../implementationGuides', 'json', []);
    await Promise.all(allFiles.map(x => uploadFile(x)));
    callback();
}
//console.log(getFilesInDir('../implementationGuides', 'json', []));
// upload all implementationGuides, given keys as paths
// If no bucket already exists, create a bucket in S3
s3.headBucket({ Bucket: bucketName }).promise()
    .then(() => {
        uploadAllFiles(() => {
            console.log("successfully uploaded implementation guides to S3");
            process.exit(0);
        })
    })
    .catch(err => {
        console.log("No bucket found, creating one...");
        s3.createBucket(
            {
                Bucket: bucketName,
                CreateBucketConfiguration: {
                    LocationConstraint: process.argv[2] // region is passed in as a command line argument
                }
            }, function(err, data) {
                if (err) {
                    console.error("Error: ", err);
                    process.exit(1);
                }
                uploadAllFiles(function() {
                    console.log("successfully uploaded implementation guides to S3");
                    process.exit(0);
                })
            }
        )
    })
