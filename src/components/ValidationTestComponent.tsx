import React from "react";

interface NestedObject {
  name: string;
  email: string;
  url?: string;
}

interface ArrayItem {
  title: string;
  description: string;
  link?: string;
}

interface ValidationTestComponentProps {
  // Scenario 1: Hidden required field
  hiddenRequiredField?: string;
  
  // Scenario 2: Nested object with required fields
  nestedObject?: NestedObject;
  
  // Scenario 2: Array with required fields
  items?: ArrayItem[];
  
  // Scenario 3: Required field that should validate
  requiredTitle?: string;
  
  // Scenario 4: URL field (testing "#" validation)
  testUrl?: string;
  
  // Conditional field visibility
  showAdvancedFields?: boolean;
  
  // Advanced nested field (should be hidden when showAdvancedFields is false)
  advancedNestedField?: string;
}

export function ValidationTestComponent({
  hiddenRequiredField,
  nestedObject,
  items = [],
  requiredTitle,
  testUrl,
  showAdvancedFields = false,
  advancedNestedField,
}: ValidationTestComponentProps) {
  return (
    <div className="p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <h2 className="text-2xl font-bold mb-4">Validation Test Component</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-white rounded">
          <h3 className="font-semibold mb-2">Scenario 1: Hidden Required Field</h3>
          <p className="text-sm text-gray-600">
            Hidden Required Field Value: {hiddenRequiredField || "(empty)"}
          </p>
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Issue: This field is required but hidden. It should NOT be treated as mandatory.
          </p>
        </div>

        <div className="p-4 bg-white rounded">
          <h3 className="font-semibold mb-2">Scenario 2: Nested Object Validation</h3>
          {nestedObject ? (
            <div className="text-sm">
              <p>Name: {nestedObject.name || "(empty)"}</p>
              <p>Email: {nestedObject.email || "(empty)"}</p>
              <p>URL: {nestedObject.url || "(empty)"}</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No nested object provided</p>
          )}
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Issue: Nested objects and arrays should validate when "Enforce custom component validation" is enabled.
          </p>
        </div>

        <div className="p-4 bg-white rounded">
          <h3 className="font-semibold mb-2">Scenario 2: Array Validation</h3>
          {items && items.length > 0 ? (
            <ul className="list-disc list-inside text-sm">
              {items.map((item, index) => (
                <li key={index}>
                  {item.title || "(no title)"} - {item.description || "(no description)"}
                  {item.link && <span className="text-blue-600"> [Link: {item.link}]</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No items in array</p>
          )}
        </div>

        <div className="p-4 bg-white rounded">
          <h3 className="font-semibold mb-2">Scenario 3: Required Title</h3>
          <p className="text-sm">
            Required Title: {requiredTitle || "(empty - should show validation error)"}
          </p>
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Issue: This field is required. Validation should prevent publishing from content list if empty.
          </p>
        </div>

        <div className="p-4 bg-white rounded">
          <h3 className="font-semibold mb-2">Scenario 4: URL Field</h3>
          <p className="text-sm">
            Test URL: {testUrl || "(empty)"}
          </p>
          <p className="text-xs text-red-600 mt-1">
            ⚠️ Issue: "#" should be a valid URL. Previously it was accepted, now it seems invalid.
          </p>
        </div>

        {showAdvancedFields && (
          <div className="p-4 bg-white rounded">
            <h3 className="font-semibold mb-2">Advanced Nested Field (Conditionally Visible)</h3>
            <p className="text-sm">
              Advanced Field: {advancedNestedField || "(empty)"}
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              ℹ️ This field is only visible when "Show Advanced Fields" is enabled.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <h4 className="font-semibold text-sm mb-2">Test Instructions:</h4>
        <ol className="list-decimal list-inside text-xs space-y-1 text-gray-700">
          <li>Try to publish without filling required fields - validation should prevent it</li>
          <li>Hide the "Hidden Required Field" and verify it's not treated as mandatory</li>
          <li>Fill nested object/array fields and verify validation works</li>
          <li>Try entering "#" in the URL field - it should be accepted</li>
          <li>Try publishing from content list without opening entry - should be blocked</li>
        </ol>
      </div>
    </div>
  );
}

export default ValidationTestComponent;

