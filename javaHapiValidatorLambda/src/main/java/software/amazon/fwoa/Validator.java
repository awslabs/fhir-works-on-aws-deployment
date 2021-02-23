/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import java.io.IOException;
import java.io.InputStream;
import java.util.stream.Collectors;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;

import org.hl7.fhir.common.hapi.validation.support.CachingValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.CommonCodeSystemsTerminologyService;
import org.hl7.fhir.common.hapi.validation.support.InMemoryTerminologyServerValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.PrePopulatedValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.ValidationSupportChain;
import org.hl7.fhir.common.hapi.validation.validator.FhirInstanceValidator;
import org.hl7.fhir.r4.model.CodeSystem;
import org.hl7.fhir.r4.model.StructureDefinition;
import org.hl7.fhir.r4.model.ValueSet;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.context.support.DefaultProfileValidationSupport;
import ca.uhn.fhir.parser.IParser;
import ca.uhn.fhir.parser.StrictErrorHandler;
import ca.uhn.fhir.rest.server.exceptions.InvalidRequestException;
import ca.uhn.fhir.validation.FhirValidator;
import ca.uhn.fhir.validation.ValidationResult;
import io.github.classgraph.ClassGraph;
import io.github.classgraph.Resource;
import io.github.classgraph.ResourceList;
import io.github.classgraph.ScanResult;
import lombok.extern.slf4j.Slf4j;
import software.amazon.fwoa.models.IgFile;
import software.amazon.fwoa.models.IgIndex;

/**
 * This class is a wrapper around the HAPI FhirValidator.
 * The FhirValidator is built using default settings and the available implementation guides are loaded into it.
 */
@Slf4j
public class Validator {
    private static final Gson GSON = new Gson();
    public static final String IMPLEMENTATION_GUIDES_FOLDER = "implementationGuides";
    private final FhirValidator validator;

    public Validator() {
        // To learn more about the different ways to configure FhirInstanceValidator see: https://hapifhir.io/hapi-fhir/docs/validation/validation_support_modules.html
        FhirContext ctx = FhirContext.forR4();

        // Create a chain that will hold our modules
        ValidationSupportChain supportChain = new ValidationSupportChain();

        // DefaultProfileValidationSupport supplies base FHIR definitions. This is generally required
        // even if you are using custom profiles, since those profiles will derive from the base
        // definitions.
        DefaultProfileValidationSupport defaultSupport = new DefaultProfileValidationSupport(ctx);
        supportChain.addValidationSupport(defaultSupport);

        // This module supplies several code systems that are commonly used in validation
        supportChain.addValidationSupport(new CommonCodeSystemsTerminologyService(ctx));

        // This module implements terminology services for in-memory code validation
        supportChain.addValidationSupport(new InMemoryTerminologyServerValidationSupport(ctx));

        // Create a PrePopulatedValidationSupport which can be used to load custom definitions.
        PrePopulatedValidationSupport prepopulatedValidationSupport = loadIgs(ctx);
        supportChain.addValidationSupport(prepopulatedValidationSupport);

        // Wrap the chain in a cache to improve performance
        CachingValidationSupport cache = new CachingValidationSupport(supportChain);

        // Create a validator using the FhirInstanceValidator module.
        FhirInstanceValidator validatorModule = new FhirInstanceValidator(cache);
        validator = ctx.newValidator().registerValidatorModule(validatorModule);

    }

    public ValidatorResponse validate(String resourceAsJsonText) {
        try {
            ValidationResult result = validator.validateWithResult(resourceAsJsonText);
            return toValidatorResponse(result);

        } catch (JsonSyntaxException | NullPointerException | IllegalArgumentException | InvalidRequestException e) {
            return ValidatorResponse.builder()
                .isSuccessful(false)
                .errorMessages(ImmutableList.of(ValidatorErrorMessage.builder()
                    .msg("Invalid JSON")
                    .severity("error")
                    .build()))
                .build();
        }
    }

    private ValidatorResponse toValidatorResponse(ValidationResult result) {
        return ValidatorResponse.builder()
            .isSuccessful(result.isSuccessful())
            .errorMessages(result.getMessages().stream()
                .map(singleValidationMessage -> ValidatorErrorMessage.builder()
                    .severity(singleValidationMessage.getSeverity().getCode())
                    .msg(singleValidationMessage.getMessage())
                    .build())
                .collect(Collectors.toList())
            )
            .build();
    }

    private PrePopulatedValidationSupport loadIgs(final FhirContext ctx) {

        final ImmutableSet<String> allowedResourceTypes = ImmutableSet.of("StructureDefinition", "CodeSystem", "ValueSet");

        IParser parser = ctx.newJsonParser();
        parser.setParserErrorHandler(new StrictErrorHandler());
        final PrePopulatedValidationSupport prePopulatedValidationSupport = new PrePopulatedValidationSupport(ctx);

        try (ScanResult allFiles = new ClassGraph().acceptPaths(IMPLEMENTATION_GUIDES_FOLDER).rejectPaths(IMPLEMENTATION_GUIDES_FOLDER + "/*/*").scan()) {
            ResourceList jsonResources = allFiles.getResourcesWithExtension("json");

            ResourceList indexFiles = jsonResources.filter(x -> x.getPath().endsWith(".index.json"));

            for (Resource indexFile : indexFiles) {
                IgIndex igIndex = GSON.fromJson(indexFile.getContentAsString(), IgIndex.class);
                for (IgFile file : igIndex.files) {
                    if (allowedResourceTypes.contains(file.resourceType)) {

                        String igResourcePath = indexFile.getPath().replace(".index.json", file.filename);
                        log.info("loading {}", igResourcePath);
                        Resource resource = allFiles.getResourcesWithPath(igResourcePath).get(0);
                        try (InputStream inputStream = resource.open()) {
                            switch (file.resourceType) {
                                case "StructureDefinition":
                                    prePopulatedValidationSupport.addStructureDefinition(parser.parseResource(StructureDefinition.class, inputStream));
                                    break;
                                case "CodeSystem":
                                    prePopulatedValidationSupport.addCodeSystem(parser.parseResource(CodeSystem.class, inputStream));
                                    break;
                                case "ValueSet":
                                    prePopulatedValidationSupport.addValueSet(parser.parseResource(ValueSet.class, inputStream));
                                    break;
                                default:
                                    // cannot happen since we checked for allowedResourceTypes
                                    break;
                            }
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        return prePopulatedValidationSupport;
    }
}
