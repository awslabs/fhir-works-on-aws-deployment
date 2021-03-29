/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

export interface Implementation {
    description: string;
    url: string;
}

export enum Code {
    Create = 'create',
    Delete = 'delete',
    Read = 'read',
    SearchType = 'search-type',
    Transaction = 'transaction',
    Update = 'update',
    Vread = 'vread',
}

export interface Interaction {
    code: Code;
}

export interface Operation {
    name: string;
    definition: string;
}

export enum Conditional {
    NotSupported = 'not-supported',
}

export enum Type {
    Date = 'date',
    Number = 'number',
    Quantity = 'quantity',
    Reference = 'reference',
    String = 'string',
    Token = 'token',
    URI = 'uri',
}

export interface SearchParam {
    name: string;
    definition: string;
    type: Type;
    documentation: string;
}

export enum Versioning {
    Versioned = 'versioned',
}

export interface ExtensionExtension {
    url: string;
    valueUri: string;
}

export interface SecurityExtension {
    url: string;
    extension: ExtensionExtension[];
}

export interface Coding {
    system: string;
    code: string;
}

export interface Service {
    coding: Coding[];
}

export interface Security {
    cors: boolean;
    service: Service[];
    extension: SecurityExtension[];
    description: string;
}

export interface Software {
    name: string;
    version: string;
}

export interface Resource {
    type: string;
    interaction: Interaction[];
    versioning: Versioning;
    readHistory: boolean;
    updateCreate: boolean;
    conditionalCreate: boolean;
    conditionalRead: Conditional;
    conditionalUpdate: boolean;
    conditionalDelete: Conditional;
    searchParam?: SearchParam[];
    searchInclude?: string[];
    searchRevInclude?: string[];
    supportedProfile?: string[];
}

export interface REST {
    mode: string;
    documentation: string;
    security: Security;
    resource: Resource[];
    interaction: Interaction[];
    operation: Operation[];
}

export interface CapabilityStatement {
    resourceType: string;
    name: string;
    title: string;
    description: string;
    purpose: string;
    status: string;
    date: Date;
    publisher: string;
    kind: string;
    software: Software;
    implementation: Implementation;
    fhirVersion: string;
    format: string[];
    rest: REST[];
}
