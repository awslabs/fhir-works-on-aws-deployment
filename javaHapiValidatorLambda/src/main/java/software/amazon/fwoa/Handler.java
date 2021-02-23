/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;

public class Handler implements RequestHandler<String, ValidatorResponse> {

    private final Validator validator;

    public Handler() {
        validator = new Validator();
    }

    @Override
    public ValidatorResponse handleRequest(String event, Context context) {
        return validator.validate(event);
    }
}
