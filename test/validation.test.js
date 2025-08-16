/**
 * Comprehensive validation tests for all data types
 * Tests validation logic for boolean, text, longtext, number, and JSON settings
 */

const { generateTestSettings } = require("./utils/test-helpers");

// Import validation functions
const {
  validateBoolean,
  validateText,
  validateTextWithLength,
  validateLongText,
  validateNumber,
  validateNumberWithRange,
  validateInteger,
  validateJSON,
  validateTextSecure,
  validateSetting,
  validateAllSettings,
} = require("../lib/validation.js");

describe("Settings Validation", () => {
  beforeEach(() => {
    generateTestSettings();
  });

  describe("Boolean Validation", () => {
    test("should validate true boolean values", () => {
      expect(validateBoolean(true)).toBe(true);
      expect(validateBoolean(false)).toBe(true);
    });

    test("should reject non-boolean values", () => {
      expect(validateBoolean("true")).toBe(false);
      expect(validateBoolean(1)).toBe(false);
      expect(validateBoolean(0)).toBe(false);
      expect(validateBoolean(null)).toBe(false);
      expect(validateBoolean(undefined)).toBe(false);
      expect(validateBoolean({})).toBe(false);
      expect(validateBoolean([])).toBe(false);
    });
  });

  describe("Text Validation", () => {
    test("should validate valid text values", () => {
      expect(validateText("valid text")).toBe(true);
      expect(validateText("")).toBe(true);
      expect(validateText("123")).toBe(true);
      expect(validateText("special!@#$%^&*()chars")).toBe(true);
    });

    test("should reject non-string values", () => {
      expect(validateText(123)).toBe(false);
      expect(validateText(true)).toBe(false);
      expect(validateText(null)).toBe(false);
      expect(validateText(undefined)).toBe(false);
      expect(validateText({})).toBe(false);
      expect(validateText([])).toBe(false);
    });

    test("should enforce maxLength constraints", () => {
      const maxLength = 50;
      const validText = "a".repeat(maxLength);
      const invalidText = "a".repeat(maxLength + 1);

      expect(validateTextWithLength(validText, maxLength)).toBe(true);
      expect(validateTextWithLength(invalidText, maxLength)).toBe(false);
    });

    test("should handle Unicode characters", () => {
      expect(validateText("Hello 世界")).toBe(true);
      expect(validateText("🚀 emoji test")).toBe(true);
      expect(validateText("Ñoño niño")).toBe(true);
    });
  });

  describe("LongText Validation", () => {
    test("should validate valid longtext values", () => {
      const longText =
        "This is a longer text that might be used for descriptions or detailed settings.";
      expect(validateLongText(longText)).toBe(true);
      expect(validateLongText("")).toBe(true);
    });

    test("should reject non-string values", () => {
      expect(validateLongText(123)).toBe(false);
      expect(validateLongText(true)).toBe(false);
      expect(validateLongText(null)).toBe(false);
      expect(validateLongText(undefined)).toBe(false);
    });

    test("should enforce maxLength constraints for longtext", () => {
      const maxLength = 1000;
      const validLongText = "a".repeat(maxLength);
      const invalidLongText = "a".repeat(maxLength + 1);

      expect(validateTextWithLength(validLongText, maxLength)).toBe(true);
      expect(validateTextWithLength(invalidLongText, maxLength)).toBe(false);
    });

    test("should handle newlines and special characters", () => {
      const textWithNewlines = "Line 1\nLine 2\rLine 3\r\nLine 4";
      expect(validateLongText(textWithNewlines)).toBe(true);

      const textWithTabs = "Column 1\tColumn 2\tColumn 3";
      expect(validateLongText(textWithTabs)).toBe(true);
    });
  });

  describe("Number Validation", () => {
    test("should validate valid number values", () => {
      expect(validateNumber(42)).toBe(true);
      expect(validateNumber(0)).toBe(true);
      expect(validateNumber(-1)).toBe(true);
      expect(validateNumber(3.14)).toBe(true);
      expect(validateNumber(1e10)).toBe(true);
    });

    test("should reject non-number values", () => {
      expect(validateNumber("42")).toBe(false);
      expect(validateNumber(true)).toBe(false);
      expect(validateNumber(null)).toBe(false);
      expect(validateNumber(undefined)).toBe(false);
      expect(validateNumber({})).toBe(false);
      expect(validateNumber([])).toBe(false);
      expect(validateNumber(NaN)).toBe(false);
      expect(validateNumber(Infinity)).toBe(false);
    });

    test("should enforce min/max constraints", () => {
      const min = 0;
      const max = 100;

      expect(validateNumberWithRange(50, min, max)).toBe(true);
      expect(validateNumberWithRange(0, min, max)).toBe(true);
      expect(validateNumberWithRange(100, min, max)).toBe(true);
      expect(validateNumberWithRange(-1, min, max)).toBe(false);
      expect(validateNumberWithRange(101, min, max)).toBe(false);
    });

    test("should handle integer vs float requirements", () => {
      // If integer required
      expect(validateInteger(42)).toBe(true);
      expect(validateInteger(0)).toBe(true);
      expect(validateInteger(-1)).toBe(true);
      expect(validateInteger(3.14)).toBe(false);
      expect(validateInteger(1.0)).toBe(true); // 1.0 is effectively an integer
    });
  });

  describe("JSON Validation", () => {
    test("should validate valid JSON values", () => {
      expect(validateJSON({ key: "value" })).toBe(true);
      expect(validateJSON([])).toBe(true);
      expect(validateJSON(null)).toBe(true);
      expect(validateJSON(true)).toBe(true);
      expect(validateJSON(42)).toBe(true);
      expect(validateJSON("string")).toBe(true);
    });

    test("should validate complex JSON objects", () => {
      const complexObject = {
        string: "value",
        number: 42,
        boolean: true,
        array: [1, 2, 3],
        nested: {
          prop: "nested value",
        },
        nullValue: null,
      };

      expect(validateJSON(complexObject)).toBe(true);
    });

    test("should reject non-serializable values", () => {
      const objectWithFunction = {
        prop: "value",
        func: function () {
          return "test";
        },
      };

      expect(validateJSON(objectWithFunction)).toBe(false);
      expect(validateJSON(undefined)).toBe(false);
      expect(validateJSON(Symbol("test"))).toBe(false);
    });

    test("should handle circular references", () => {
      const circularObject = { prop: "value" };
      circularObject.circular = circularObject;

      expect(validateJSON(circularObject)).toBe(false);
    });

    test("should validate JSON arrays", () => {
      expect(validateJSON([])).toBe(true);
      expect(validateJSON([1, 2, 3])).toBe(true);
      expect(validateJSON(["a", "b", "c"])).toBe(true);
      expect(validateJSON([{ key: "value" }])).toBe(true);
    });
  });

  describe("Enum Validation", () => {
    test("should validate valid enum values", () => {
      const options = { option1: "", option2: "Second" };
      expect(validateSetting("enum", "option1", { options })).toBe(true);
    });

    test("should reject invalid enum values", () => {
      const options = { option1: "First", option2: "Second" };
      expect(validateSetting("enum", "missing", { options })).toBe(false);
    });
  });

  describe("Setting Schema Validation", () => {
    test("should validate complete setting object", () => {
      const validSetting = {
        type: "text",
        value: "test value",
        description: "Test setting",
        maxLength: 100,
      };

      expect(validateSetting(validSetting)).toBe(true);
    });

    test("should reject setting with missing required fields", () => {
      const invalidSetting = {
        value: "test value",
        // Missing type and description
      };

      expect(validateSetting(invalidSetting)).toBe(false);
    });

    test("should validate setting type matches value type", () => {
      const validBooleanSetting = {
        type: "boolean",
        value: true,
        description: "Boolean setting",
      };

      const invalidBooleanSetting = {
        type: "boolean",
        value: "true",
        description: "Boolean setting",
      };

      expect(validateSetting(validBooleanSetting)).toBe(true);
      expect(validateSetting(invalidBooleanSetting)).toBe(false);
    });

    test("should validate setting constraints", () => {
      const textSettingWithValidLength = {
        type: "text",
        value: "short",
        description: "Text setting",
        maxLength: 10,
      };

      const textSettingWithInvalidLength = {
        type: "text",
        value: "this is too long",
        description: "Text setting",
        maxLength: 10,
      };

      expect(validateSetting(textSettingWithValidLength)).toBe(true);
      expect(validateSetting(textSettingWithInvalidLength)).toBe(false);
    });
  });

  describe("Bulk Validation", () => {
    test("should validate multiple settings at once", () => {
      const validSettings = generateTestSettings();
      expect(validateAllSettings(validSettings)).toBe(true);
    });

    test("should identify invalid settings in bulk", () => {
      const mixedSettings = {
        ...generateTestSettings(),
        invalidSetting: {
          type: "boolean",
          value: "not a boolean",
          description: "Invalid setting",
        },
      };

      const result = validateAllSettings(mixedSettings);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("invalidSetting");
    });

    test("should provide detailed error messages", () => {
      const invalidSetting = {
        type: "number",
        value: "not a number",
        description: "Invalid number setting",
      };

      const result = validateSetting(invalidSetting);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Expected number, got string");
    });
  });

  describe("Edge Cases", () => {
    test("should handle empty values appropriately", () => {
      expect(validateText("")).toBe(true);
      expect(validateLongText("")).toBe(true);
      expect(validateJSON(null)).toBe(true);
      expect(validateNumber(0)).toBe(true);
    });

    test("should handle very large values", () => {
      const largeText = "a".repeat(10000);
      expect(validateTextWithLength(largeText, 10000)).toBe(true);
      expect(validateTextWithLength(largeText, 5000)).toBe(false);

      const largeNumber = Number.MAX_SAFE_INTEGER;
      expect(validateNumber(largeNumber)).toBe(true);
    });

    test("should handle special number values", () => {
      expect(validateNumber(NaN)).toBe(false);
      expect(validateNumber(Infinity)).toBe(false);
      expect(validateNumber(-Infinity)).toBe(false);
      expect(validateNumber(Number.MAX_VALUE)).toBe(true);
      expect(validateNumber(Number.MIN_VALUE)).toBe(true);
    });

    test("should handle deeply nested JSON", () => {
      const deepObject = { level1: { level2: { level3: { level4: "deep" } } } };
      expect(validateJSON(deepObject)).toBe(true);
    });
  });

  describe("Security Validation", () => {
    test("should sanitize HTML/script content", () => {
      const maliciousText = '<script>alert("xss")</script>';
      expect(validateTextSecure(maliciousText)).toBe(false);

      const htmlText = "<p>Paragraph</p>";
      expect(validateTextSecure(htmlText)).toBe(false);
    });

    test("should validate against injection attacks", () => {
      const sqlInjection = "'; DROP TABLE users; --";
      expect(validateTextSecure(sqlInjection)).toBe(false);

      const jsInjection = 'javascript:alert("xss")';
      expect(validateTextSecure(jsInjection)).toBe(false);
    });
  });
});
