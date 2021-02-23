/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.google.common.collect.ImmutableList;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class ValidatorTest {

    public static final ValidatorResponse INVALID_JSON_VALIDATOR_RESPONSE = ValidatorResponse.builder()
        .isSuccessful(false)
        .errorMessages(ImmutableList.of(ValidatorErrorMessage.builder()
            .msg("Invalid JSON")
            .severity("error")
            .build()))
        .build();
    static Validator validator;


    @BeforeAll
    static void setup() {
        // Creating the HAPI validator takes several seconds. It's ok to reuse the same validator across tests to speed up tests
        validator = new Validator();
    }

    @Test
    void simple_patient() {
        String resourceText = "{\"resourceType\":\"Patient\"}";
        ValidatorResponse validatorResponse = validator.validate(resourceText);

        assertTrue(validatorResponse.isSuccessful());
    }
    @Test
    void us_core_patient() {
        String resourceText = "{\"resourceType\":\"Patient\",\"id\":\"example\",\"meta\":{\"profile\":[\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient\"]},\"text\":{\"status\":\"generated\",\"div\":\"<div xmlns=\\\"http://www.w3.org/1999/xhtml\\\"><p><b>Generated Narrative</b></p><p><b>id</b>: example</p><p><b>meta</b>: </p><p><b>identifier</b>: Medical Record Number: 1032702 (USUAL)</p><p><b>active</b>: true</p><p><b>name</b>: Amy V. Shaw , Amy V. Baxter </p><p><b>telecom</b>: ph: 555-555-5555(HOME), amy.shaw@example.com</p><p><b>gender</b>: female</p><p><b>birthDate</b>: 1987-02-20</p><p><b>address</b>: </p><ul><li>49 Meadow St Mounds OK 74047 US </li><li>183 Mountain View St Mounds OK 74048 US </li></ul></div>\"},\"extension\":[{\"extension\":[{\"url\":\"ombCategory\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2106-3\",\"display\":\"White\"}},{\"url\":\"ombCategory\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"1002-5\",\"display\":\"American Indian or Alaska Native\"}},{\"url\":\"ombCategory\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2028-9\",\"display\":\"Asian\"}},{\"url\":\"detailed\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"1586-7\",\"display\":\"Shoshone\"}},{\"url\":\"detailed\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2036-2\",\"display\":\"Filipino\"}},{\"url\":\"text\",\"valueString\":\"Mixed\"}],\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-race\"},{\"extension\":[{\"url\":\"ombCategory\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2135-2\",\"display\":\"Hispanic or Latino\"}},{\"url\":\"detailed\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2184-0\",\"display\":\"Dominican\"}},{\"url\":\"detailed\",\"valueCoding\":{\"system\":\"urn:oid:2.16.840.1.113883.6.238\",\"code\":\"2148-5\",\"display\":\"Mexican\"}},{\"url\":\"text\",\"valueString\":\"Hispanic or Latino\"}],\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity\"},{\"url\":\"http://hl7.org/fhir/us/core/StructureDefinition/us-core-birthsex\",\"valueCode\":\"F\"}],\"identifier\":[{\"use\":\"usual\",\"type\":{\"coding\":[{\"system\":\"http://terminology.hl7.org/CodeSystem/v2-0203\",\"code\":\"MR\",\"display\":\"Medical Record Number\"}],\"text\":\"Medical Record Number\"},\"system\":\"http://hospital.smarthealthit.org\",\"value\":\"1032702\"}],\"active\":true,\"name\":[{\"family\":\"Shaw\",\"given\":[\"Amy\",\"V.\"],\"period\":{\"start\":\"2016-12-06\",\"end\":\"2020-07-22\"}},{\"family\":\"Baxter\",\"given\":[\"Amy\",\"V.\"],\"suffix\":[\"PharmD\"],\"period\":{\"start\":\"2020-07-22\"}}],\"telecom\":[{\"system\":\"phone\",\"value\":\"555-555-5555\",\"use\":\"home\"},{\"system\":\"email\",\"value\":\"amy.shaw@example.com\"}],\"gender\":\"female\",\"birthDate\":\"1987-02-20\",\"address\":[{\"line\":[\"49 Meadow St\"],\"city\":\"Mounds\",\"state\":\"OK\",\"postalCode\":\"74047\",\"country\":\"US\",\"period\":{\"start\":\"2016-12-06\",\"end\":\"2020-07-22\"}},{\"line\":[\"183 Mountain View St\"],\"city\":\"Mounds\",\"state\":\"OK\",\"postalCode\":\"74048\",\"country\":\"US\",\"period\":{\"start\":\"2020-07-22\"}}]}";
        ValidatorResponse validatorResponse = validator.validate(resourceText);

        // it is expected to fail since unit tests are not loading any IGs
        assertFalse(validatorResponse.isSuccessful());
    }

    @Test
    void empty() {
        String resourceText = "";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void array() {
        String resourceText = "[1,2,3]";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void null_json() {
        String resourceText = "null";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void null_java() {
        String resourceText = null;

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void number_json() {
        String resourceText = "123";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void boolean_json() {
        String resourceText = "true";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }

    @Test
    void bad_json() {
        String resourceText = "{a:<>}}}";

        assertEquals(validator.validate(resourceText), INVALID_JSON_VALIDATOR_RESPONSE);
    }
}