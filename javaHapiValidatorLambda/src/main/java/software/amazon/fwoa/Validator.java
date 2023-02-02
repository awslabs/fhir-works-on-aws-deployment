/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

package software.amazon.fwoa;

import static org.apache.commons.lang3.StringUtils.isNotBlank;

import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;

import org.apache.commons.lang3.Validate;
import org.hl7.fhir.common.hapi.validation.support.CommonCodeSystemsTerminologyService;
import org.hl7.fhir.common.hapi.validation.support.InMemoryTerminologyServerValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.PrePopulatedValidationSupport;
import org.hl7.fhir.common.hapi.validation.support.ValidationSupportChain;
import org.hl7.fhir.common.hapi.validation.validator.FhirInstanceValidator;
import org.hl7.fhir.instance.model.api.IBase;
import org.hl7.fhir.instance.model.api.IBaseResource;
import org.hl7.fhir.instance.model.api.IPrimitiveType;
import org.hl7.fhir.r4.model.CodeSystem;
import org.hl7.fhir.r4.model.StructureDefinition;
import org.hl7.fhir.r4.model.ValueSet;

import ca.uhn.fhir.context.FhirContext;
import ca.uhn.fhir.context.RuntimeResourceDefinition;
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
    public static final String DEFAULT_IMPLEMENTATION_GUIDES_FOLDER = "implementationGuides";
    public static final String FHIR_R4 = "4.0.1";
    public static final String FHIR_STU3 = "3.0.1";

    private final FhirValidator validator;

    private final FhirContext ctx;

    private final String fhirVersion;
    private final String implementationGuidesFolder;

    public Validator() {
        this(FHIR_R4, DEFAULT_IMPLEMENTATION_GUIDES_FOLDER);
    }

    public Validator(String fhirVersion) {
        this(fhirVersion, DEFAULT_IMPLEMENTATION_GUIDES_FOLDER);
    }

    public Validator(String fhirVersion, String implementationGuidesFolder) {
        if (!Objects.equals(fhirVersion, FHIR_R4) && !Objects.equals(fhirVersion, FHIR_STU3)) {
            throw new RuntimeException("Invalid FHIR version " + fhirVersion);
        }
        this.fhirVersion = fhirVersion;
        this.implementationGuidesFolder = implementationGuidesFolder;
        // To learn more about the different ways to configure FhirInstanceValidator see: https://hapifhir.io/hapi-fhir/docs/validation/validation_support_modules.html
        ctx = FHIR_R4.equals(fhirVersion) ? FhirContext.forR4() : FhirContext.forDstu3();

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

        // Create a validator using the FhirInstanceValidator module.
        FhirInstanceValidator validatorModule = new FhirInstanceValidator(supportChain);
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
                    .msg(singleValidationMessage.getLocationString() + " - " + singleValidationMessage.getMessage())
                    .build())
                .collect(Collectors.toList())
            )
            .build();
    }

    private PrePopulatedValidationSupport loadIgs(final FhirContext ctx) {

        final Map<String, IBaseResource> myCodeSystems = new HashMap<>();
        final Map<String, IBaseResource> myStructureDefinitions = new HashMap<>();
        final Map<String, IBaseResource> myValueSets = new HashMap<>();

        final ImmutableSet<String> allowedResourceTypes = ImmutableSet.of("StructureDefinition", "CodeSystem", "ValueSet");

        IParser parser = ctx.newJsonParser();
        parser.setParserErrorHandler(new StrictErrorHandler());

        try (ScanResult allFiles = new ClassGraph().acceptPaths(implementationGuidesFolder).rejectPaths(implementationGuidesFolder + "/*/*").scan()) {
            ResourceList jsonResources = allFiles.getResourcesWithExtension("json");

            ResourceList indexFiles = jsonResources.filter(x -> x.getPath().endsWith(".index.json"));

            for (Resource indexFile : indexFiles) {
                IgIndex igIndex = GSON.fromJson(indexFile.getContentAsString(), IgIndex.class);
                for (IgFile file : igIndex.files) {
                    if (allowedResourceTypes.contains(file.resourceType)) {

                        String igResourcePath = indexFile.getPath().replace(".index.json", file.filename);
                        log.info("loading {}", igResourcePath);
                        ResourceList resourcesWithPath = allFiles.getResourcesWithPath(igResourcePath);
                        if (resourcesWithPath.isEmpty()) {
                            throw new RuntimeException("The following file is declared in .index.json but does not exist: " + igResourcePath);
                        }
                        Resource resource = resourcesWithPath.get(0);
                        try (InputStream inputStream = resource.open()) {
                            switch (file.resourceType) {
                                case "StructureDefinition":
                                    Class<? extends IBaseResource> structureDefinitionClass = fhirVersion.equals(FHIR_R4)
                                        ? StructureDefinition.class
                                        : org.hl7.fhir.dstu3.model.StructureDefinition.class;
                                    addStructureDefinition(parser.parseResource(structureDefinitionClass, inputStream), myStructureDefinitions);
                                    break;
                                case "CodeSystem":
                                    Class<? extends IBaseResource> codeSystemClass = fhirVersion.equals(FHIR_R4)
                                        ? CodeSystem.class
                                        : org.hl7.fhir.dstu3.model.CodeSystem.class;
                                    addCodeSystem(parser.parseResource(codeSystemClass, inputStream), myCodeSystems);
                                    break;
                                case "ValueSet":
                                    Class<? extends IBaseResource> valueSetClass = fhirVersion.equals(FHIR_R4)
                                        ? ValueSet.class
                                        : org.hl7.fhir.dstu3.model.ValueSet.class;
                                    addValueSet(parser.parseResource(valueSetClass, inputStream), myValueSets);
                                    break;
                                default:
                                    // cannot happen since we checked for allowedResourceTypes
                                    break;
                            }
                        } catch (Exception e) {
                            log.error("Failed to load Implementation guides", e);
                            throw new RuntimeException(e);
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to load Implementation guides", e);
            throw new RuntimeException(e);
        }

        return new PrePopulatedValidationSupport(ctx, myStructureDefinitions, myValueSets, myCodeSystems);
    }

    // The following methods are mostly identical as the ones within PrePopulatedValidationSupport.
    // There is an issue that prevents using PrePopulatedValidationSupport.addValueSet for dstu3 https://github.com/hapifhir/hapi-fhir/issues/2432
    // The workaround is to use the constructor instead, but that requires us to build the resource maps exactly as PrePopulatedValidationSupport expects them.
    // Once the issue is fixed this methods can be deleted and simply use addStructureDefinition, addCodeSystem, addValueSet from PrePopulatedValidationSupport.
    private void addCodeSystem(IBaseResource theCodeSystem, Map<String, IBaseResource> theCodeSystems) {
        String url = processResourceAndReturnUrl(theCodeSystem, "CodeSystem");
        addToMap(theCodeSystem, theCodeSystems, url);
    }

    private void addStructureDefinition(IBaseResource theStructureDefinition, Map<String, IBaseResource> theStructureDefinitions) {
        String url = processResourceAndReturnUrl(theStructureDefinition, "StructureDefinition");
        addToMap(theStructureDefinition, theStructureDefinitions, url);
    }

    private void addValueSet(IBaseResource theValueSet, Map<String, IBaseResource> theValueSets) {
        String url = processResourceAndReturnUrl(theValueSet, "ValueSet");
        addToMap(theValueSet, theValueSets, url);
    }

    private String processResourceAndReturnUrl(IBaseResource theCodeSystem, String theResourceName) {
        Validate.notNull(theCodeSystem, "the" + theResourceName + " must not be null");
        RuntimeResourceDefinition resourceDef = ctx.getResourceDefinition(theCodeSystem);
        String actualResourceName = resourceDef.getName();
        Validate.isTrue(actualResourceName.equals(theResourceName), "the" + theResourceName + " must be a " + theResourceName + " - Got: " + actualResourceName);

        Optional<IBase> urlValue = resourceDef.getChildByName("url").getAccessor().getFirstValueOrNull(theCodeSystem);
        String url = urlValue.map(t -> (((IPrimitiveType<?>) t).getValueAsString())).orElse(null);

        Validate.notNull(url, "the" + theResourceName + ".getUrl() must not return null");
        Validate.notBlank(url, "the" + theResourceName + ".getUrl() must return a value");
        return url;
    }

    private <T extends IBaseResource> void addToMap(T theStructureDefinition, Map<String, T> map, String theUrl) {
        if (isNotBlank(theUrl)) {
            map.put(theUrl, theStructureDefinition);

            int lastSlashIdx = theUrl.lastIndexOf('/');
            if (lastSlashIdx != -1) {
                map.put(theUrl.substring(lastSlashIdx + 1), theStructureDefinition);
                int previousSlashIdx = theUrl.lastIndexOf('/', lastSlashIdx - 1);
                if (previousSlashIdx != -1) {
                    map.put(theUrl.substring(previousSlashIdx + 1), theStructureDefinition);
                }
            }

        }
    }
}
