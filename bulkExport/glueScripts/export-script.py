"""
 Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
"""
"""
To allow customers to download data from DDB, we first export the data to S3. Once the files are in S3, users can
download the S3 files by being being provided signed S3 urls.type_list
This is a Glue script (https://aws.amazon.com/glue/). This script is uploaded to a private S3 bucket, and provided
to the export Glue job. The Glue job runs this script to export data from DDB to S3.
"""
import sys
import boto3
import re
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from datetime import datetime

glueContext = GlueContext(SparkContext.getOrCreate())
job = Job(glueContext)

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'jobId', 'exportType', 'transactionTime', 'since', 'outputFormat', 'glueDatabase', 'glueTableName', 's3OutputBucket'])

# type and groupId are optional parameters
type = None
if ('--{}'.format('type') in sys.argv):
    type = getResolvedOptions(sys.argv, ['type'])['type']
groupId = None
if ('--{}'.format('groupId') in sys.argv):
    groupId = getResolvedOptions(sys.argv, ['groupId'])['groupId']

job_id = args['jobId']
export_type = args['exportType']
transaction_time = args['transactionTime']
since = args['since']
outputFormat = args['outputFormat']
glue_table_name = args['glueTableName']

glue_database = args['glueDatabase']
bucket_name = args['s3OutputBucket']

# Read data from DDB
original_data_source_dyn_frame = glueContext.create_dynamic_frame.from_catalog(database = glue_database, table_name = glue_table_name)

print('Start filtering by transactionTime and Since')
# Filter by transactionTime and Since
datetime_since = datetime.strptime(since, "%Y-%m-%dT%H:%M:%S.%fZ")
datetime_transaction_time = datetime.strptime(transaction_time, "%Y-%m-%dT%H:%M:%S.%fZ")

filtered_dates_dyn_frame = Filter.apply(frame = original_data_source_dyn_frame,
                           f = lambda x:
                           datetime.strptime(x["meta"]["lastUpdated"], "%Y-%m-%dT%H:%M:%S.%fZ") > datetime_since and
                           datetime.strptime(x["meta"]["lastUpdated"], "%Y-%m-%dT%H:%M:%S.%fZ") <= datetime_transaction_time
                          )

print('Start filtering by documentStatus and resourceType')
# Filter by resource listed in Type and with correct STATUS
type_list = None if type == None else type.split(',')
valid_document_state_to_be_read_from = ['AVAILABLE','LOCKED', 'PENDING_DELETE']
filtered_dates_resource_dyn_frame = Filter.apply(frame = filtered_dates_dyn_frame,
                                    f = lambda x:
                                    x["documentStatus"] in valid_document_state_to_be_read_from if type_list is None
                                    else x["documentStatus"] in valid_document_state_to_be_read_from and x["resourceType"] in type_list
                          )

if filtered_dates_resource_dyn_frame.count() > 0:
    print('Dropping fields not needed')
    # Drop fields that are not needed
    data_source_cleaned_dyn_frame = DropFields.apply(frame = filtered_dates_resource_dyn_frame, paths = ['documentStatus', 'lockEndTs', 'vid'])

    print('Combining data into fewer partitions')
    # Combine data into at most 10 partitions
    data_frame = data_source_cleaned_dyn_frame.toDF()
    data_frame = data_frame.coalesce(10)

    print('Writing data to S3')
    # Export data to S3 split by resourceType
    dynamic_frame_write = DynamicFrame.fromDF(data_frame, glueContext, "dynamic_frame_write")
    glueContext.write_dynamic_frame.from_options(
        frame = dynamic_frame_write,
        connection_type = "s3",
        connection_options = {
            "path": "s3://" + bucket_name + "/" + job_id,
            "partitionKeys": ["resourceType"],
        },
        format = "json"
    )

    # Rename exported files into ndjson files
    client = boto3.client('s3')

    response = client.list_objects(
        Bucket=bucket_name,
        Prefix=job_id,
    )

    print('Renaming files')
    regex_pattern = '\/resourceType=(\w+)\/run-\d{13}-part-r-(\d{5})'
    for item in response['Contents']:
        source_s3_file_path = item['Key']
        match = re.search(regex_pattern, source_s3_file_path)
        new_s3_file_name = match.group(1) + "-" + match.group(2) + ".ndjson"
        new_s3_file_path = job_id + '/' + new_s3_file_name

        copy_source = {
            'Bucket': bucket_name,
            'Key': source_s3_file_path
        }
        client.copy(copy_source, bucket_name, new_s3_file_path)
        client.delete_object(Bucket=bucket_name, Key=source_s3_file_path)
else:
    print('No resources within requested parameters to export')