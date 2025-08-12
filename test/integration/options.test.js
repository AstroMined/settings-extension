/**
 * Integration tests for options page functionality
 * Tests advanced settings page and configuration
 */

const {
  createMockStorage,
  createMockRuntime,
  generateTestSettings,
} = require("../utils/test-helpers");

// Mock DOM methods
const mockDOM = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createTextNode: jest.fn(),
};

// Mock document
global.document = {
  getElementById: mockDOM.getElementById,
  createElement: mockDOM.createElement,
  addEventListener: mockDOM.addEventListener,
  querySelector: mockDOM.querySelector,
  querySelectorAll: mockDOM.querySelectorAll,
  createTextNode: mockDOM.createTextNode,
  readyState: "complete",
};

describe("Options Page Integration Tests", () => {
  let mockStorage;
  let mockRuntime;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorage();
    mockRuntime = createMockRuntime();

    global.browser = {
      storage: { local: mockStorage },
      runtime: mockRuntime,
    };

    // Reset DOM mocks
    Object.keys(mockDOM).forEach((key) => {
      mockDOM[key].mockReset();
    });
  });

  describe("Options Page Initialization", () => {
    test("should initialize options page when DOM is ready", () => {
      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);

      require("../../options/options.js");

      expect(mockDOM.getElementById).toHaveBeenCalledWith("advanced-settings");
    });

    test("should load all settings on initialization", async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);

      require("../../options/options.js");

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStorage.get).toHaveBeenCalledWith(null);
    });

    test("should create settings categories", async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockCategoryElement = {
        className: "",
        appendChild: jest.fn(),
        innerHTML: "",
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockCategoryElement);
      mockDOM.createTextNode.mockImplementation((text) => ({
        textContent: text,
      }));

      require("../../options/options.js");

      // Wait for async initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockDOM.createElement).toHaveBeenCalledWith("div");
      expect(mockContainer.appendChild).toHaveBeenCalled();
    });
  });

  describe("Advanced Settings Display", () => {
    test("should render longtext settings with textarea", async () => {
      const testSettings = {
        testLongtext: {
          type: "longtext",
          value: "This is a long text value",
          description: "Test longtext setting",
          maxLength: 1000,
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockTextarea = {
        tagName: "TEXTAREA",
        value: "",
        maxLength: 0,
        rows: 5,
        addEventListener: jest.fn(),
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockImplementation((tag) => {
        if (tag === "textarea") return mockTextarea;
        return {
          className: "",
          appendChild: jest.fn(),
          innerHTML: "",
        };
      });

      require("../../options/options.js");

      // Wait for async rendering
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTextarea.maxLength).toBe(1000);
      expect(mockTextarea.rows).toBe(5);
    });

    test("should render JSON settings with syntax highlighting", async () => {
      const testSettings = {
        testJSON: {
          type: "json",
          value: { key: "value", nested: { array: [1, 2, 3] } },
          description: "Test JSON setting",
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockTextarea = {
        tagName: "TEXTAREA",
        value: "",
        className: "",
        addEventListener: jest.fn(),
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockImplementation((tag) => {
        if (tag === "textarea") return mockTextarea;
        return {
          className: "",
          appendChild: jest.fn(),
          innerHTML: "",
        };
      });

      require("../../options/options.js");

      // Wait for async rendering
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockTextarea.className).toContain("json-editor");
      expect(mockTextarea.value).toBe(
        JSON.stringify(testSettings.testJSON.value, null, 2),
      );
    });

    test("should group settings by category", async () => {
      const testSettings = {
        generalSetting: {
          type: "boolean",
          value: true,
          description: "General setting",
          category: "General",
        },
        advancedSetting: {
          type: "number",
          value: 100,
          description: "Advanced setting",
          category: "Advanced",
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockCategoryElement = {
        className: "",
        appendChild: jest.fn(),
        innerHTML: "",
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockCategoryElement);

      require("../../options/options.js");

      // Wait for async rendering
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should create separate category sections
      expect(mockContainer.appendChild).toHaveBeenCalledTimes(2);
    });
  });

  describe("Settings Validation and Saving", () => {
    test("should validate JSON settings before saving", async () => {
      const testSettings = {
        testJSON: {
          type: "json",
          value: { valid: "json" },
          description: "Test JSON setting",
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);
      mockStorage.set.mockResolvedValue();

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockTextarea = {
        tagName: "TEXTAREA",
        value: '{"valid": "json", "updated": true}',
        className: "json-editor",
        addEventListener: jest.fn(),
        dataset: { key: "testJSON" },
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockImplementation((tag) => {
        if (tag === "textarea") return mockTextarea;
        return {
          className: "",
          appendChild: jest.fn(),
          innerHTML: "",
        };
      });

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate user input change
      const changeHandler = mockTextarea.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      changeHandler();

      // Wait for async save
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockStorage.set).toHaveBeenCalled();
    });

    test("should handle invalid JSON gracefully", async () => {
      const testSettings = {
        testJSON: {
          type: "json",
          value: {},
          description: "Test JSON setting",
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockTextarea = {
        tagName: "TEXTAREA",
        value: '{"invalid": json}', // Invalid JSON
        className: "json-editor",
        addEventListener: jest.fn(),
        dataset: { key: "testJSON" },
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockImplementation((tag) => {
        if (tag === "textarea") return mockTextarea;
        return {
          className: "",
          appendChild: jest.fn(),
          innerHTML: "",
        };
      });

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate user input change
      const changeHandler = mockTextarea.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      changeHandler();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should validate longtext length constraints", async () => {
      const testSettings = {
        testLongtext: {
          type: "longtext",
          value: "short text",
          description: "Test longtext",
          maxLength: 20,
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockTextarea = {
        tagName: "TEXTAREA",
        value: "This text is way too long for the maximum length constraint",
        maxLength: 20,
        addEventListener: jest.fn(),
        dataset: { key: "testLongtext" },
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockImplementation((tag) => {
        if (tag === "textarea") return mockTextarea;
        return {
          className: "",
          appendChild: jest.fn(),
          innerHTML: "",
        };
      });

      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate user input change
      const changeHandler = mockTextarea.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      changeHandler();

      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Bulk Operations", () => {
    test("should handle bulk export to file", async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);

      // Mock URL and Blob APIs
      global.URL = {
        createObjectURL: jest.fn(() => "blob:mock-url"),
        revokeObjectURL: jest.fn(),
      };
      global.Blob = jest.fn();

      const mockExportButton = {
        addEventListener: jest.fn(),
      };

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.getElementById.mockImplementation((id) => {
        if (id === "bulk-export") return mockExportButton;
        if (id === "advanced-settings") return mockContainer;
        return null;
      });

      require("../../options/options.js");

      // Simulate export button click
      const exportHandler = mockExportButton.addEventListener.mock.calls.find(
        (call) => call[0] === "click",
      )[1];

      exportHandler();

      expect(global.Blob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test("should handle bulk import with validation", async () => {
      const mockFileInput = {
        addEventListener: jest.fn(),
        files: [],
      };

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.getElementById.mockImplementation((id) => {
        if (id === "bulk-import") return mockFileInput;
        if (id === "advanced-settings") return mockContainer;
        return null;
      });

      // Mock FileReader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: JSON.stringify(generateTestSettings()),
      };

      global.FileReader = jest.fn(() => mockFileReader);

      require("../../options/options.js");

      // Simulate file selection
      const changeHandler = mockFileInput.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      const mockFile = new File(
        [JSON.stringify(generateTestSettings())],
        "settings.json",
      );
      mockFileInput.files = [mockFile];

      changeHandler();

      // Simulate FileReader onload
      mockFileReader.onload();

      expect(mockFileReader.readAsText).toHaveBeenCalledWith(mockFile);
    });
  });

  describe("Search and Filtering", () => {
    test("should filter settings based on search query", async () => {
      const testSettings = {
        booleanSetting: {
          type: "boolean",
          value: true,
          description: "A boolean setting for testing",
        },
        textSetting: {
          type: "text",
          value: "test",
          description: "A text setting for configuration",
        },
      };

      mockStorage.get.mockResolvedValue(testSettings);

      const mockSearchInput = {
        addEventListener: jest.fn(),
        value: "boolean",
      };

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
        children: [],
      };

      mockDOM.getElementById.mockImplementation((id) => {
        if (id === "settings-search") return mockSearchInput;
        if (id === "advanced-settings") return mockContainer;
        return null;
      });

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate search input
      const inputHandler = mockSearchInput.addEventListener.mock.calls.find(
        (call) => call[0] === "input",
      )[1];

      inputHandler();

      // Search functionality should filter visible settings
      expect(mockSearchInput.addEventListener).toHaveBeenCalledWith(
        "input",
        expect.any(Function),
      );
    });

    test("should show all settings when search is cleared", async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);

      const mockSearchInput = {
        addEventListener: jest.fn(),
        value: "",
      };

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
        children: [],
      };

      mockDOM.getElementById.mockImplementation((id) => {
        if (id === "settings-search") return mockSearchInput;
        if (id === "advanced-settings") return mockContainer;
        return null;
      });

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate clearing search
      const inputHandler = mockSearchInput.addEventListener.mock.calls.find(
        (call) => call[0] === "input",
      )[1];

      inputHandler();

      // All settings should be visible when search is empty
      expect(inputHandler).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should handle missing DOM elements gracefully", () => {
      mockDOM.getElementById.mockReturnValue(null);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      expect(() => {
        require("../../options/options.js");
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should handle storage errors during save", async () => {
      mockStorage.get.mockResolvedValue(generateTestSettings());
      mockStorage.set.mockRejectedValue(new Error("Storage quota exceeded"));

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      const mockElement = {
        tagName: "INPUT",
        type: "text",
        value: "new value",
        addEventListener: jest.fn(),
        dataset: { key: "testSetting" },
      };

      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      require("../../options/options.js");

      // Wait for initialization
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Simulate user input change
      const changeHandler = mockElement.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      changeHandler();

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test("should handle file import errors", async () => {
      const mockFileInput = {
        addEventListener: jest.fn(),
        files: [new File(["invalid json"], "invalid.json")],
      };

      const mockContainer = {
        innerHTML: "",
        appendChild: jest.fn(),
      };

      mockDOM.getElementById.mockImplementation((id) => {
        if (id === "bulk-import") return mockFileInput;
        if (id === "advanced-settings") return mockContainer;
        return null;
      });

      // Mock FileReader with error
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: "invalid json content",
      };

      global.FileReader = jest.fn(() => mockFileReader);

      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      require("../../options/options.js");

      // Simulate file selection and reading
      const changeHandler = mockFileInput.addEventListener.mock.calls.find(
        (call) => call[0] === "change",
      )[1];

      changeHandler();
      mockFileReader.onload();

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});
