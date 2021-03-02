/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
