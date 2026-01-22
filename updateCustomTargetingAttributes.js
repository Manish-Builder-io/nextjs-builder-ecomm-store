#!/usr/bin/env node

/**
 * Update Builder.io Space Settings - Custom Targeting Attributes
 * 
 * This script allows you to programmatically update custom targeting attributes,
 * specifically enum values, using the Builder Admin SDK.
 * 
 * Usage:
 *   node updateCustomTargetingAttributes.js [options]
 * 
 * Options:
 *   --get                    Get current space settings (default action)
 *   --update                 Update custom targeting attributes
 *   --attribute-name NAME    Name of the custom targeting attribute to update
 *   --enum-values VALUES     Comma-separated list of enum values (e.g., "value1,value2,value3")
 *   --attribute-type TYPE    Type of attribute: "enum", "string", "number", "boolean" (default: "enum")
 * 
 * Environment variables:
 *   - BUILDER_ADMIN_API_KEY (required): Private Builder API key (bpk-***).
 * 
 * Examples:
 *   # Get current space settings
 *   node updateCustomTargetingAttributes.js --get
 * 
 *   # Add enum values to an existing attribute (merges with existing)
 *   node updateCustomTargetingAttributes.js --update --attribute-name "location" --enum-values "CA,DE"
 * 
 *   # Replace all enum values for an attribute
 *   node updateCustomTargetingAttributes.js --update --attribute-name "location" --enum-values "US,UK,IN,FR,CA" --replace
 * 
 *   # Update with JSON file (for complex updates)
 *   node updateCustomTargetingAttributes.js --update --from-file attributes.json
 * 
 * Documentation: 
 *   https://www.builder.io/c/docs/admin-graphql-api
 *   https://github.com/BuilderIO/builder/tree/main/packages/admin-sdk
 */

import process from "node:process";
import { readFileSync } from "node:fs";
import { createAdminApiClient } from "@builder.io/admin-sdk";

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    action: "get", // default: get
    attributeName: null,
    enumValues: null,
    attributeType: "enum",
    fromFile: null,
    replace: false, // if true, replace all enum values; if false, merge with existing
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--get":
        options.action = "get";
        break;
      case "--update":
        options.action = "update";
        break;
      case "--attribute-name":
        options.attributeName = args[++i];
        break;
      case "--enum-values":
        options.enumValues = args[++i];
        break;
      case "--attribute-type":
        options.attributeType = args[++i];
        break;
      case "--from-file":
        options.fromFile = args[++i];
        break;
      case "--replace":
        options.replace = true;
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: node updateCustomTargetingAttributes.js [options]

Options:
  --get                    Get current space settings (default)
  --update                 Update custom targeting attributes
  --attribute-name NAME    Name of the custom targeting attribute
  --enum-values VALUES     Comma-separated enum values
  --attribute-type TYPE    Type: enum, string, number, boolean (default: enum)
  --replace                Replace all enum values (default: merge/add to existing)
  --from-file FILE         Load attributes from JSON file
  --help, -h               Show this help message

Environment variables:
  BUILDER_ADMIN_API_KEY    Private Builder API key (required)
        `);
        process.exit(0);
        break;
    }
  }

  return options;
}

async function main() {
  const privateKey = process.env.BUILDER_ADMIN_API_KEY || "bpk-a761fc8568094c1a903ca3ca55b3bf72";
  
  if (!privateKey) {
    console.error("❌  Missing BUILDER_ADMIN_API_KEY environment variable.");
    console.error("   Set it with: export BUILDER_ADMIN_API_KEY=bpk-...");
    process.exit(1);
  }

  // Create Admin SDK client
  const adminSDK = createAdminApiClient(privateKey);

  const options = parseArgs();

  try {
    if (options.action === "get") {
      await getSpaceSettings(adminSDK);
    } else if (options.action === "update") {
      await updateCustomTargetingAttributes(adminSDK, options);
    }
  } catch (error) {
    console.error("❌  Unexpected error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Get current space settings including custom targeting attributes
 */
async function getSpaceSettings(adminSDK) {
  console.info("ℹ️  Fetching current space settings...\n");

  try {
    const result = await adminSDK.query({
      settings: true,
    });

    // Admin SDK returns { data: { settings: ... } }
    let settings = result.data?.settings;
    if (!settings) {
      console.error("❌  No settings data returned.");
      process.exit(1);
    }

    if (typeof settings === "string") {
      try {
        settings = JSON.parse(settings);
      } catch {
        console.warn("⚠️  Could not parse settings as JSON");
      }
    }

  console.info("✅ Space Settings Retrieved:\n");
  if (settings.id) {
    console.info(`Space ID: ${settings.id}`);
  }
  if (settings.name) {
    console.info(`Space Name: ${settings.name}\n`);
  }

  // Display custom targeting attributes
  // Note: customTargetingAttributes is an object, not an array
  // Keys are attribute names, values are { type, enum } objects
  const customTargetingAttributes = settings?.customTargetingAttributes || 
                                    settings?.targetingAttributes ||
                                    settings?.customAttributes ||
                                    {};

  const attributeKeys = Object.keys(customTargetingAttributes);
  if (attributeKeys.length === 0) {
    console.info("📋 No custom targeting attributes found.\n");
  } else {
    console.info(`📋 Custom Targeting Attributes (${attributeKeys.length}):\n`);
    attributeKeys.forEach((attrName, index) => {
      const attr = customTargetingAttributes[attrName];
      console.info(`${index + 1}. ${attrName}`);
      console.info(`   Type: ${attr.type || "unknown"}`);
      if (attr.enum && Array.isArray(attr.enum)) {
        console.info(`   Enum values: ${attr.enum.join(", ")}`);
      }
      if (attr.defaultValue !== undefined) {
        console.info(`   Default: ${attr.defaultValue}`);
      }
      console.info("");
    });
  }

    // Output full settings as JSON for reference
    console.info("📄 Full Settings JSON:\n");
    console.info(JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error("❌  Failed to fetch space settings.");
    console.error(` • ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

/**
 * Update custom targeting attributes
 */
async function updateCustomTargetingAttributes(adminSDK, options) {
  console.info("ℹ️  Updating custom targeting attributes...\n");

  // First, get current settings
  let settings;
  try {
    const getResult = await adminSDK.query({
      settings: true,
    });
    // Admin SDK returns { data: { settings: ... } }
    settings = getResult.data?.settings;
  } catch (error) {
    console.error("❌  Failed to fetch current space settings.");
    console.error(` • ${error.message}`);
    process.exit(1);
  }

  // Parse settings if it's a string
  if (typeof settings === "string") {
    try {
      settings = JSON.parse(settings);
    } catch {
      console.error("❌  Could not parse current settings.");
      process.exit(1);
    }
  }

  if (!settings) {
    settings = {};
  }

  // Initialize custom targeting attributes object if it doesn't exist
  // Note: customTargetingAttributes is an object, not an array
  if (!settings.customTargetingAttributes && 
      !settings.targetingAttributes && 
      !settings.customAttributes) {
    settings.customTargetingAttributes = {};
  }

  const customTargetingAttributes = settings.customTargetingAttributes || 
                                    settings.targetingAttributes ||
                                    settings.customAttributes;

  // Load attributes from file if provided
  if (options.fromFile) {
    try {
      const fileContent = readFileSync(options.fromFile, "utf-8");
      const fileData = JSON.parse(fileContent);
      
      if (fileData.customTargetingAttributes) {
        // Merge settings from file
        Object.assign(settings, fileData);
      } else if (typeof fileData === 'object' && !Array.isArray(fileData)) {
        // If fileData is an object, treat it as customTargetingAttributes
        settings.customTargetingAttributes = fileData;
        settings.targetingAttributes = fileData;
        settings.customAttributes = fileData;
      } else {
        console.error("❌  Invalid JSON file format. Expected object with customTargetingAttributes or an object mapping attribute names to their configs.");
        process.exit(1);
      }
      
      console.info(`✅ Loaded attributes from ${options.fromFile}`);
    } catch (error) {
      console.error(`❌  Failed to read file ${options.fromFile}:`, error.message);
      process.exit(1);
    }
  } else if (options.attributeName) {
    // Update specific attribute
    if (!options.enumValues && options.attributeType === "enum") {
      console.error("❌  --enum-values is required when updating enum attributes.");
      process.exit(1);
    }

    const enumValues = options.enumValues 
      ? options.enumValues.split(",").map(v => v.trim()).filter(Boolean)
      : [];

    // customTargetingAttributes is an object where keys are attribute names
    const attributeExists = customTargetingAttributes.hasOwnProperty(options.attributeName);

    const attribute = {
      type: options.attributeType,
    };

    if (options.attributeType === "enum" && enumValues.length > 0) {
      attribute.enum = enumValues;
    }

    if (attributeExists) {
      // Update existing attribute
      const existingAttr = customTargetingAttributes[options.attributeName];
      
      // For enum types, merge with existing enum values (avoid duplicates) unless --replace is used
      if (options.attributeType === "enum" && enumValues.length > 0 && existingAttr.enum && !options.replace) {
        const existingEnums = Array.isArray(existingAttr.enum) ? existingAttr.enum : [];
        const mergedEnums = [...new Set([...existingEnums, ...enumValues])]; // Remove duplicates
        attribute.enum = mergedEnums;
        console.info(`📝 Updating existing attribute: ${options.attributeName}`);
        console.info(`   Merging enum values: [${existingEnums.join(", ")}] + [${enumValues.join(", ")}] = [${mergedEnums.join(", ")}]`);
      } else if (options.attributeType === "enum" && enumValues.length > 0 && options.replace) {
        console.info(`📝 Replacing enum values for attribute: ${options.attributeName}`);
        console.info(`   Old values: [${Array.isArray(existingAttr.enum) ? existingAttr.enum.join(", ") : "none"}]`);
        console.info(`   New values: [${enumValues.join(", ")}]`);
      } else {
        console.info(`📝 Updating existing attribute: ${options.attributeName}`);
      }
      
      customTargetingAttributes[options.attributeName] = {
        ...existingAttr,
        ...attribute,
      };
    } else {
      // Add new attribute
      console.info(`➕ Adding new attribute: ${options.attributeName}`);
      customTargetingAttributes[options.attributeName] = attribute;
    }

    // Ensure all three possible keys are set (for compatibility)
    settings.customTargetingAttributes = customTargetingAttributes;
    settings.targetingAttributes = customTargetingAttributes;
    settings.customAttributes = customTargetingAttributes;
  } else {
    console.error("❌  Either --attribute-name or --from-file must be provided.");
    process.exit(1);
  }

  // Display the prepared changes
  console.info("\n📋 Prepared Changes:\n");
  const updatedAttributes = settings.customTargetingAttributes || {};
  const attributeKeys = Object.keys(updatedAttributes);
  if (attributeKeys.length > 0) {
    attributeKeys.forEach((attrName, index) => {
      const attr = updatedAttributes[attrName];
      console.info(`${index + 1}. ${attrName}`);
      console.info(`   Type: ${attr.type || "unknown"}`);
      if (attr.enum && Array.isArray(attr.enum)) {
        console.info(`   Enum values: ${attr.enum.join(", ")}`);
      }
      console.info("");
    });
  }

  // Save the updated settings to a file for reference
  const { writeFileSync } = await import("node:fs");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFile = `updated-settings-${timestamp}.json`;
  writeFileSync(outputFile, JSON.stringify(settings, null, 2));
  console.info(`💾 Updated settings saved to: ${outputFile}\n`);

  // Note: Builder.io Admin GraphQL API doesn't have a direct updateSettings mutation
  // We'll try using the Write API endpoint, but it may not be supported
  console.info("🔄 Attempting to update space settings via Write API...\n");
  console.info("⚠️  Note: Builder.io may not support programmatic updates to space settings.");
  console.info("    If this fails, you can manually update settings in the Builder.io UI.\n");

  try {
    // Try using the Write API endpoint for space settings
    // Note: The Admin SDK doesn't have a direct updateSettings method,
    // so we fall back to the Write API HTTP endpoint
    const writeApiUrl = "https://builder.io/api/v1/write/space";
    const privateKey = process.env.BUILDER_ADMIN_API_KEY || "bpk-a761fc8568094c1a903ca3ca55b3bf72";
    
    const updateResponse = await fetch(writeApiUrl, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${privateKey}`,
      },
      body: JSON.stringify({
        settings: settings,
      }),
    });

    const updateResult = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error("❌  Failed to update space settings via Write API.");
      console.error(`   Status: ${updateResponse.status}`);
      console.error(`   Response:`, JSON.stringify(updateResult, null, 2));
      console.error("\n💡 Alternative Options:");
      console.error("   1. Manually update in Builder.io UI:");
      console.error("      - Go to Space Settings > Custom Targeting Attributes");
      console.error("      - Edit the attribute and add the new enum value");
      console.error(`   2. Use the prepared settings file: ${outputFile}`);
      console.error("      - Copy the customTargetingAttributes section");
      console.error("      - Use it as reference when updating manually");
      process.exit(1);
    }

    console.info("✅ Successfully updated space settings!\n");
    
    // Fetch updated settings to display
    const updatedResult = await adminSDK.query({
      settings: true,
    });
    
    // Admin SDK returns { data: { settings: ... } }
    let updatedSettings = updatedResult.data?.settings;
    if (typeof updatedSettings === "string") {
      try {
        updatedSettings = JSON.parse(updatedSettings);
      } catch {
        // ignore
      }
    }
    
    const finalAttributes = updatedSettings?.customTargetingAttributes || 
                              updatedSettings?.targetingAttributes ||
                              updatedSettings?.customAttributes ||
                              {};
    
    const finalAttributeKeys = Object.keys(finalAttributes);
    if (finalAttributeKeys.length > 0) {
      console.info("📋 Updated Custom Targeting Attributes:\n");
      finalAttributeKeys.forEach((attrName, index) => {
        const attr = finalAttributes[attrName];
        console.info(`${index + 1}. ${attrName}`);
        console.info(`   Type: ${attr.type || "unknown"}`);
        if (attr.enum && Array.isArray(attr.enum)) {
          console.info(`   Enum values: ${attr.enum.join(", ")}`);
        }
        console.info("");
      });
    }
  } catch (error) {
    console.error("❌  Error updating settings:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    console.error("\n💡 Alternative Options:");
    console.error("   1. Manually update in Builder.io UI:");
    console.error("      - Go to Space Settings > Custom Targeting Attributes");
    console.error("      - Edit the attribute and add the new enum value");
    console.error(`   2. Use the prepared settings file: ${outputFile}`);
    console.error("      - Copy the customTargetingAttributes section");
    console.error("      - Use it as reference when updating manually");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌  Unexpected error:", error.message);
  if (error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
});

