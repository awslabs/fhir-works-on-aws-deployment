/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import java.util.List;

import lombok.Builder;
import lombok.Value;

@Builder
@Value
class ValidatorResponse {
    private boolean isSuccessful;
    private List<ValidatorErrorMessage> errorMessages;
}

@Builder
@Value
class ValidatorErrorMessage {
    private String severity;
    private String msg;
}
