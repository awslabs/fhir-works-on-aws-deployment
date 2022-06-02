/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa.models;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

public class IgFile {
    @SerializedName("filename")
    @Expose
    public String filename;
    @SerializedName("resourceType")
    @Expose
    public String resourceType;
    @SerializedName("id")
    @Expose
    public String id;
    @SerializedName("url")
    @Expose
    public String url;
    @SerializedName("version")
    @Expose
    public String version;
    @SerializedName("type")
    @Expose
    public String type;
    @SerializedName("kind")
    @Expose
    public String kind;
}
