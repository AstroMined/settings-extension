const SettingsManager = require("../lib/settings-manager");

// Minimal tests for SettingsManager validateSetting enum handling

describe("SettingsManager", () => {
  test("validateSetting should accept enum options with empty labels", () => {
    const manager = new SettingsManager();
    const setting = {
      type: "enum",
      description: "Enum with empty label",
      options: { option1: "", option2: "Label" },
    };

    expect(() => manager.validateSetting(setting, "option1")).not.toThrow();
  });
});
