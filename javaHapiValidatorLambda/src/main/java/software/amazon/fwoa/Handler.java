/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.S3ObjectInputStream;
import com.amazonaws.services.s3.model.S3ObjectSummary;
import com.amazonaws.util.IOUtils;

import software.amazon.fwoa.Utils.IGObject;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class Handler implements RequestHandler<String, ValidatorResponse> {

    private final Validator validator;
    private static final AmazonS3 s3 = AmazonS3ClientBuilder.standard().build();
    private String bucketName = System.getenv("IMPLEMENTATION_GUIDES_BUCKET");

    public Handler() {
        log.info("Creating the Validator instance for the first time...");

        String fhirVersion = System.getenv("FHIR_VERSION");
        if (fhirVersion == null) {
            fhirVersion = Validator.FHIR_R4;
        }
        if (bucketName == null) {
            throw new Error("Implementation Guides Bucket not found!");
        }
        List<String> objectKeys = getBucketObjects(bucketName);
        Map<String, List<IGObject>> igObjects = downloadObjects(objectKeys, bucketName);
        validator = new Validator(fhirVersion, igObjects.get("indices"), igObjects.get("resources"));

        log.info("Validating once to force the loading of all the validator related classes");
        // Validating a complex Patient yields better results. validating a trivial
        // "empty" Patient won't load all the validation classes.
        String someSyntheaPatient = "{\"resourceType\":\"Patient\",\"id\":\"a8bc0c9f-47b3-ee31-60c6-fb8ce8077ac7\",\"text\":{\"status\":\"generated\",\"div\":\"<div xmlns=\\\"http://www.w3.org/1999/xhtml\\\">Generated by <a href=\\\"https://github.com/synthetichealth/synthea\\\">Synthea</a>.Version identifier: master-branch-latest-2-gfd2217b\\n .   Person seed: -5969330820059413579  Population seed: 1614314878171</div>\"},\"extension\":[{\"url\":\"http://hl7.org/fhir/StructureDefinition/patient-mothersMaidenName\",\"valueString\":\"Son314 Vandervort697\"},{\"url\":\"http://hl7.org/fhir/StructureDefinition/patient-birthPlace\",\"valueAddress\":{\"city\":\"New Bedford\",\"state\":\"Massachusetts\",\"country\":\"US\"}},{\"url\":\"http://synthetichealth.github.io/synthea/disability-adjusted-life-years\",\"valueDecimal\":1.1872597438165626},{\"url\":\"http://synthetichealth.github.io/synthea/quality-adjusted-life-years\",\"valueDecimal\":70.81274025618343}],\"identifier\":[{\"system\":\"https://github.com/synthetichealth/synthea\",\"value\":\"a8bc0c9f-47b3-ee31-60c6-fb8ce8077ac7\"},{\"type\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v2-0203\",\"code\":\"MR\",\"display\":\"Medical Record Number\"}],\"text\":\"Medical Record Number\"},\"system\":\"http://hospital.smarthealthit.org\",\"value\":\"a8bc0c9f-47b3-ee31-60c6-fb8ce8077ac7\"},{\"type\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v2-0203\",\"code\":\"SS\",\"display\":\"Social Security Number\"}],\"text\":\"Social Security Number\"},\"system\":\"http://hl7.org/fhir/sid/us-ssn\",\"value\":\"999-49-6778\"},{\"type\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v2-0203\",\"code\":\"DL\",\"display\":\"Driver's License\"}],\"text\":\"Driver's License\"},\"system\":\"urn:oid:2.16.840.1.113883.4.3.25\",\"value\":\"S99922723\"},{\"type\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v2-0203\",\"code\":\"PPN\",\"display\":\"Passport Number\"}],\"text\":\"Passport Number\"},\"system\":\"http://standardhealthrecord.org/fhir/StructureDefinition/passportNumber\",\"value\":\"X72123203X\"}],\"name\":[{\"use\":\"official\",\"family\":\"Beier427\",\"given\":[\"Minnie888\"],\"prefix\":[\"Mrs.\"]},{\"use\":\"maiden\",\"family\":\"Jaskolski867\",\"given\":[\"Minnie888\"],\"prefix\":[\"Mrs.\"]}],\"telecom\":[{\"system\":\"phone\",\"value\":\"555-390-9260\",\"use\":\"home\"}],\"gender\":\"female\",\"birthDate\":\"1949-01-01\",\"address\":[{\"extension\":[{\"url\":\"http://hl7.org/fhir/StructureDefinition/geolocation\",\"extension\":[{\"url\":\"latitude\",\"valueDecimal\":41.83492774608349},{\"url\":\"longitude\",\"valueDecimal\":-70.58336455010793}]}],\"line\":[\"862 Sauer Station Suite 31\"],\"city\":\"Plymouth\",\"state\":\"Massachusetts\",\"country\":\"US\"}],\"maritalStatus\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v3-MaritalStatus\",\"code\":\"M\",\"display\":\"M\"}],\"text\":\"M\"},\"multipleBirthInteger\":3,\"communication\":[{\"language\":{\"coding\":[{\"system\":\"urn:ietf:bcp:47\",\"code\":\"en-US\",\"display\":\"English\"}],\"text\":\"English\"}}]}";
        validator.validate(someSyntheaPatient);
        log.info("Validator is ready");
    }

    @Override
    public ValidatorResponse handleRequest(String event, Context context) {
        ValidatorResponse validate = validator.validate(event);
        return validate;

    }

    private List<String> getBucketObjects(String bucketName) {
        try {
            List<String> objectKeys = new ArrayList<String>();
            ListObjectsV2Request req = new ListObjectsV2Request().withBucketName(bucketName);
            ListObjectsV2Result result;
            do {
                result = s3.listObjectsV2(req);

                for (S3ObjectSummary objectSummary : result.getObjectSummaries()) {
                    objectKeys.add(objectSummary.getKey());
                }
                // If there are more than maxKeys keys in the bucket, get a continuation token
                // and list the next objects.
                String token = result.getNextContinuationToken();
                req.setContinuationToken(token);
            } while (result.isTruncated());
            log.info("found " + objectKeys.size() + " keys");
            return objectKeys;
        } catch (Exception e) {
            throw new Error(e);
        }
    }

    private Map<String, List<IGObject>> downloadObjects(List<String> keys, String bucketName) {
        // keep track of .index.json objects
        List<IGObject> indices = new ArrayList<IGObject>();
        List<IGObject> resources = new ArrayList<IGObject>();
        for (String key : keys) {
            try (S3ObjectInputStream s3Object = s3.getObject(bucketName, key).getObjectContent()) {
                IGObject bucketObj = new Utils.IGObject(key, IOUtils.toString(s3Object));
                if (key.contains(".index.json")) {
                    indices.add(bucketObj);
                } else {
                    resources.add(bucketObj);
                }
            } catch (Exception e) {
                log.error(e.getMessage());
                throw new Error(e);
            }
        }
        log.info("finished downloading all object content into memory");
        Map<String, List<IGObject>> downloadGuidesHolder = new HashMap<String, List<IGObject>>();
        downloadGuidesHolder.put("indices", indices);
        downloadGuidesHolder.put("resources", resources);
        return downloadGuidesHolder;
    }
}
