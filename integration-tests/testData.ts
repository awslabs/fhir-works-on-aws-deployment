/*
 *  Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: Apache-2.0
 */

import { Chance } from 'chance';

// eslint-disable-next-line import/prefer-default-export
export const getTestCondition = () => {
    const chance = new Chance();
    return {
        resourceType: 'Condition',
        id: chance.word({ length: 15 }),
        text: {
            status: 'generated',
            div: '<div xmlns="http://www.w3.org/1999/xhtml">Severe burn of left ear (Date: 24-May 2012)</div>',
        },
        clinicalStatus: {
            coding: [
                {
                    system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                    code: 'active',
                },
            ],
        },
        verificationStatus: {
            coding: [
                {
                    system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                    code: 'confirmed',
                },
            ],
        },
        category: [
            {
                coding: [
                    {
                        system: 'http://terminology.hl7.org/CodeSystem/condition-category',
                        code: 'encounter-diagnosis',
                        display: 'Encounter Diagnosis',
                    },
                    {
                        system: 'http://snomed.info/sct',
                        code: '439401001',
                        display: 'Diagnosis',
                    },
                ],
            },
        ],
        severity: {
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '24484000',
                    display: 'Severe',
                },
            ],
        },
        code: {
            coding: [
                {
                    system: 'http://snomed.info/sct',
                    code: '39065001',
                    display: 'Burn of ear',
                },
            ],
            text: 'Burnt Ear',
        },
        bodySite: [
            {
                coding: [
                    {
                        system: 'http://snomed.info/sct',
                        code: '49521004',
                        display: 'Left external ear structure',
                    },
                ],
                text: 'Left Ear',
            },
        ],
        subject: {
            reference: 'https://fhir.server.com/dev/Patient/patientId',
        },
        onsetDateTime: '2012-05-24',
    };
};

export const getMedicationRequest = () => {
    const chance = new Chance();
    return {
        resourceType: 'MedicationRequest',
        id: chance.word({ length: 15 }),
        text: {
            status: 'generated',
            div: '<div xmlns="http://www.w3.org/1999/xhtml"><p><b>Generated Narrative</b></p><p><b>id</b>: self-tylenol</p><p><b>identifier</b>: id: 12345689 (OFFICIAL)</p><p><b>status</b>: active</p><p><b>intent</b>: plan</p><p><b>reported</b>: true</p><p><b>medication</b>: <span title="Codes: {http://www.nlm.nih.gov/research/umls/rxnorm 1187314}">Tylenol PM Pill</span></p><p><b>subject</b>: <a href="Patient-example.html">Amy V. Shaw. Generated Summary: id: example; Medical Record Number: 1032702 (USUAL); active; Amy V. Shaw , Amy V. Baxter ; ph: 555-555-5555(HOME), amy.shaw@example.com; gender: female; birthDate: 1987-02-20</a></p><p><b>encounter</b>: <a href="Encounter-example-1.html">Office Visit. Generated Summary: id: example-1; status: finished; <span title="{http://terminology.hl7.org/CodeSystem/v3-ActCode AMB}">ambulatory</span>; <span title="Codes: {http://www.ama-assn.org/go/cpt 99201}">Office Visit</span>; period: 02/11/2015 9:00:14 AM --&gt; 02/11/2015 10:00:14 AM</a></p><p><b>authoredOn</b>: 2019-06-24</p><p><b>requester</b>: <a href="Patient-example.html">**self-prescribed**. Generated Summary: id: example; Medical Record Number: 1032702 (USUAL); active; Amy V. Shaw , Amy V. Baxter ; ph: 555-555-5555(HOME), amy.shaw@example.com; gender: female; birthDate: 1987-02-20</a></p><p><b>dosageInstruction</b>: </p></div>',
        },
        identifier: [{ use: 'official', system: 'http://acme.org/prescriptions', value: '12345689' }],
        status: 'active',
        intent: 'plan',
        reportedBoolean: true,
        medicationCodeableConcept: {
            coding: [
                { system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: '1187314', display: 'Tylenol PM Pill' },
            ],
            text: 'Tylenol PM Pill',
        },
        subject: { reference: 'https://fhir.server.com/dev/Patient/patientId' },
        encounter: { reference: 'Encounter/example-1', display: 'Office Visit' },
        authoredOn: '2019-06-24',
        requester: { reference: 'Patient/example', display: '**self-prescribed**' },
        dosageInstruction: [{ text: 'Takes 1-2 tablets once daily at bedtime as needed for restless legs' }],
    };
};
