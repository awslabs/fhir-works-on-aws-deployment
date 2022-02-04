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
import json
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from datetime import datetime

glueContext = GlueContext(SparkContext.getOrCreate())
job = Job(glueContext)

args = getResolvedOptions(sys.argv, ['JOB_NAME', 'jobId', 'jobOwnerId', 'exportType', 'transactionTime', 'since', 'outputFormat', 'ddbTableName', 'workerType', 'numberWorkers', 's3OutputBucket'])

# type and tenantId are optional parameters
type = None
if ('--{}'.format('type') in sys.argv):
    type = getResolvedOptions(sys.argv, ['type'])['type']
groupId = None
if ('--{}'.format('groupId') in sys.argv):
    groupId = getResolvedOptions(sys.argv, ['groupId'])['groupId']
tenantId = None
if ('--{}'.format('tenantId') in sys.argv):
    tenantId = getResolvedOptions(sys.argv, ['tenantId'])['tenantId']

# the following parameters are only needed for group export
group_id = None
if ('--{}'.format('groupId') in sys.argv):
   group_id = getResolvedOptions(sys.argv, ['groupId'])['groupId']
   s3_script_bucket = getResolvedOptions(sys.argv, ['s3ScriptBucket'])['s3ScriptBucket']
   compartment_search_param_file = getResolvedOptions(sys.argv, ['compartmentSearchParamFile'])['compartmentSearchParamFile']
   server_url = getResolvedOptions(sys.argv, ['serverUrl'])['serverUrl']
   transitive_reference_param_file = "transitiveReferenceParams.json"

job_id = args['jobId']
job_owner_id = args['jobOwnerId']
export_type = args['exportType']
transaction_time = args['transactionTime']
since = args['since']
outputFormat = args['outputFormat']
ddb_table_name = args['ddbTableName']
worker_type = args['workerType']
number_workers = args['numberWorkers']

bucket_name = args['s3OutputBucket']

# Read data from DDB
# dynamodb.splits is determined by the formula from the weblink below
# https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-connect.html#aws-glue-programming-etl-connect-dynamodb
if (worker_type != "G.2X" and worker_type != "G.1X"):
    raise Exception(f"Worker type {worker_type} not supported. Please choose either worker G2.X or G1.X")

num_executors = int(number_workers) - 1
num_slots_per_executor = 16 if worker_type == "G.2X" else 8
original_data_source_dyn_frame = glueContext.create_dynamic_frame.from_options(
    connection_type="dynamodb",
    connection_options={
        "dynamodb.input.tableName": ddb_table_name,
        "dynamodb.throughput.read.percent": "0.5",
        "dynamodb.splits": str(num_executors * num_slots_per_executor)
    }
)

print('Start filtering by tenantId')

def remove_composite_id(resource):
  # Replace the multi-tenant composite id with the original resource id found at "_id"
  resource["id"] = resource["_id"]
  return resource

# Filter by tenantId
if (tenantId is None):
    filtered_tenant_id_frame = original_data_source_dyn_frame
else:
    filtered_tenant_id_frame_with_composite_id = Filter.apply(frame = original_data_source_dyn_frame,
                               f = lambda x:
                               x['_tenantId'] == tenantId)

    filtered_tenant_id_frame = Map.apply(frame = filtered_tenant_id_frame_with_composite_id, f = remove_composite_id)

print ('start filtering by group_id')
def is_active_group_member(member, datetime_transaction_time):
    if getattr(member, 'inactive', None) == True:
        return False
    member_period = getattr(member, 'period', None)
    if member_period != None:
        end_date = getattr(member_period, 'end', None)
        if end_date != None and datetime.strptime(end_date, "%Y-%m-%dT%H:%M:%S.%fZ") < datetime_transaction_time:
            return False
    return True

def is_internal_reference(reference, server_url):
    if reference.startswith(server_url):
        reference = removeprefix(reference, server_url)
    reference_split = reference.split('/')
    if len(reference_split) == 2:
        return True
    return False

def deep_get(resource, path):
    temp = [resource]
    for p in path:
        new_temp = []
        for item in temp:
            if item is None or p not in item:
                continue
            if isinstance(item[p], list):
                new_temp.extend(item[p])
            else:
                new_temp.append(item[p])
        temp = new_temp
    return temp

def is_included_in_group_export(resource, group_member_ids, group_patient_ids, compartment_search_params, server_url, transitive_reference_ids=set()):
    # Check if resource is part of the group
    if resource['id'] in group_member_ids or resource['id'] in transitive_reference_ids:
        return True
    # Check if resource is part of the patient compartment
    if resource['resourceType'] in compartment_search_params:
        # Get inclusion criteria paths for the resource
        inclusion_paths = compartment_search_params[resource['resourceType']]
        for path in inclusion_paths:
            reference = deep_get(resource, path.split("."))
            for ref in reference:
                if is_internal_reference(ref['reference'], server_url) and ref['reference'].split('/')[-1] in group_patient_ids:
                    return True
    return False

# Transitive reference are resources referenced in group members or patient compartment resources
# Transitive reference is extracted based on file bulkExport/schema/transitiveReferenceParams.json
# Update the file and redeploy to change transitive reference to be included
def get_transitive_references(resource, transitive_reference_map, server_url):
    if resource['resourceType'] in transitive_reference_map:
        path_map = transitive_reference_map[resource['resourceType']]
        generated_transitive_refs = []
        for path, target_type in path_map.items():
            targets = deep_get(resource, path.split('.'))
            generated_transitive_refs.extend([target['reference'] for target in targets if is_internal_reference(target['reference'], server_url)])
        resource['_generated_transitive_refs'] = generated_transitive_refs if len(generated_transitive_refs) !=0 else None
    return resource

datetime_transaction_time = datetime.strptime(transaction_time, "%Y-%m-%dT%H:%M:%S.%fZ")

if (group_id is None):
    filtered_group_reference_frame = filtered_tenant_id_frame
else:
    print('Loading patient compartment search params')
    client = boto3.client('s3')
    s3Obj_compartment = client.get_object(Bucket = s3_script_bucket,
                Key = compartment_search_param_file)
    compartment_search_params = json.load(s3Obj_compartment['Body'])

    s3Obj_transitive = client.get_object(Bucket = s3_script_bucket,
                    Key = transitive_reference_param_file)
    transitive_reference_params = json.load(s3Obj_transitive['Body'])

    print('Extract group member ids')
    group_members = Filter.apply(frame = filtered_tenant_id_frame, f = lambda x: x['id'] == group_id).toDF().sort("meta.versionId").collect()[-1]['member']
    active_group_member_references = [x['entity']['reference'] for x in group_members if is_active_group_member(x, datetime_transaction_time) and is_internal_reference(x['entity']['reference'], server_url)]
    group_member_ids = set([x.split('/')[-1] for x in active_group_member_references])
    group_patient_ids = set([x.split('/')[-1] for x in active_group_member_references if x.split('/')[-2] == 'Patient'])
    print('Group member ids extracted: ', group_member_ids)
    print('Group patient ids extracted: ', group_patient_ids)

    print('Extract group member and patient compartment dataframe')
    filtered_group_frame = Filter.apply(frame = filtered_tenant_id_frame, f = lambda x: is_included_in_group_export(x, group_member_ids, group_patient_ids, compartment_search_params, server_url))

    filtered_group_reference_frame = filtered_group_frame
    if transitive_reference_params:
        print('Extract transitive references')
        transitive_reference_frame = Map.apply(frame = filtered_group_frame, f = lambda x: get_transitive_references(x, transitive_reference_params, server_url))
        transitive_reference_frame = Filter.apply(frame = transitive_reference_frame, f = lambda x: x['_generated_transitive_refs'] is not None)
        transitive_reference_frame = SelectFields.apply(frame = transitive_reference_frame, paths=['_generated_transitive_refs']).toDF().collect()

        transitive_reference_set = set()
        for item in transitive_reference_frame:
            transitive_reference_set.update(reference.split('/')[-1] for reference in item['_generated_transitive_refs'])
        print('Transitive reference ids extracted: ', transitive_reference_set)

        if transitive_reference_set:
            # Filter here again from tenant_id_frame to include group members, patient compartment and transitive reference
            filtered_group_reference_frame = Filter.apply(frame = filtered_tenant_id_frame, f = lambda x: is_included_in_group_export(x, group_member_ids, group_patient_ids, compartment_search_params, server_url, transitive_reference_ids=transitive_reference_set))

print('Start filtering by transactionTime and Since')
# Filter by transactionTime and Since
datetime_since = datetime.strptime(since, "%Y-%m-%dT%H:%M:%S.%fZ")
filtered_dates_dyn_frame = Filter.apply(frame = filtered_group_reference_frame,
                           f = lambda x:
                           datetime.strptime(x["meta"]["lastUpdated"], "%Y-%m-%dT%H:%M:%S.%fZ") > datetime_since and
                           datetime.strptime(x["meta"]["lastUpdated"], "%Y-%m-%dT%H:%M:%S.%fZ") <= datetime_transaction_time
                          )

print('Start filtering by documentStatus and resourceType')
# Filter by resource listed in Type and with correct STATUS
type_list = None if type == None else set(type.split(','))
valid_document_state_to_be_read_from = {'AVAILABLE','LOCKED', 'PENDING_DELETE'}
filtered_dates_resource_dyn_frame = Filter.apply(frame = filtered_dates_dyn_frame,
                                    f = lambda x:
                                    x["documentStatus"] in valid_document_state_to_be_read_from if type_list is None
                                    else x["documentStatus"] in valid_document_state_to_be_read_from and x["resourceType"] in type_list
                          )


# Drop fields that are not needed
print('Dropping fields that are not needed')
data_source_cleaned_dyn_frame = DropFields.apply(frame = filtered_dates_resource_dyn_frame, paths = ['documentStatus', 'lockEndTs', 'vid', '_references', '_tenantId', '_id', '_subscriptionStatus'])

def add_dup_resource_type(record):
    record["resourceTypeDup"] = record["resourceType"]
    return record

# Create duplicated column so we can use it in partitionKey later
data_source_cleaned_dyn_frame = data_source_cleaned_dyn_frame.map(add_dup_resource_type)

# To export one S3 file per resourceType, we repartition(1)
data_source_cleaned_dyn_frame = data_source_cleaned_dyn_frame.repartition(1)

if len(data_source_cleaned_dyn_frame.toDF().head(1)) == 0:
    print('No resources within requested parameters to export')
else:
    print('Writing data to S3')
    # Export data to S3 split by resourceType
    glueContext.write_dynamic_frame.from_options(
        frame = data_source_cleaned_dyn_frame,
        connection_type = "s3",
        connection_options = {
            "path": "s3://" + bucket_name + "/" + job_id,
            "partitionKeys": ["resourceTypeDup"],
        },
        format = "json"
    )

    # Rename exported files into ndjson files
    print('Renaming files')
    client = boto3.client('s3')

    response = client.list_objects(
        Bucket=bucket_name,
        Prefix=job_id,
    )

    regex_pattern = '\/resourceTypeDup=(\w+)\/run-\d{13}-part-r-(\d{5})'
    for item in response['Contents']:
        source_s3_file_path = item['Key']
        match = re.search(regex_pattern, source_s3_file_path)
        new_s3_file_name = match.group(1) + "-" + match.group(2) + ".ndjson"
        tenant_specific_path = '' if (tenantId is None) else tenantId + '/'
        new_s3_file_path = tenant_specific_path + job_id + '/' + new_s3_file_name

        copy_source = {
            'Bucket': bucket_name,
            'Key': source_s3_file_path
        }

        extra_args = {
            'ContentType':'application/fhir+ndjson',
            'Metadata': {
                'job-owner-id': job_owner_id
            },
            'MetadataDirective':'REPLACE'
        }

        client.copy(copy_source, bucket_name, new_s3_file_path, ExtraArgs=extra_args)
        client.delete_object(Bucket=bucket_name, Key=source_s3_file_path)
    print('Export job finished')
