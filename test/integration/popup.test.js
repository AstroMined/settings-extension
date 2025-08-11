/**
 * Integration tests for popup functionality
 * Tests popup initialization and user interactions
 */

const { createMockStorage, createMockRuntime, generateTestSettings } = require('../utils/test-helpers');

// Mock DOM methods
const mockDOM = {
  getElementById: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn()
};

// Mock document
global.document = {
  getElementById: mockDOM.getElementById,
  createElement: mockDOM.createElement,
  addEventListener: mockDOM.addEventListener,
  querySelector: mockDOM.querySelector,
  querySelectorAll: mockDOM.querySelectorAll,
  readyState: 'complete'
};

describe('Popup Integration Tests', () => {
  let mockStorage;
  let mockRuntime;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorage();
    mockRuntime = createMockRuntime();
    
    global.browser = {
      storage: { local: mockStorage },
      runtime: mockRuntime
    };

    // Reset DOM mocks
    Object.keys(mockDOM).forEach(key => {
      mockDOM[key].mockReset();
    });
  });

  describe('Popup Initialization', () => {
    test('should initialize popup when DOM is ready', () => {
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      
      // Load popup script
      require('../../popup/popup.js');
      
      expect(mockDOM.getElementById).toHaveBeenCalledWith('settings-container');
    });

    test('should load settings on initialization', async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      
      require('../../popup/popup.js');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockStorage.get).toHaveBeenCalledWith(null);
    });

    test('should handle initialization errors gracefully', async () => {
      mockStorage.get.mockRejectedValue(new Error('Storage error'));
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      require('../../popup/popup.js');
      
      // Wait for async initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Settings Display', () => {
    test('should render boolean settings', async () => {
      const testSettings = {
        testBoolean: {
          type: 'boolean',
          value: true,
          description: 'Test boolean setting'
        }
      };
      
      mockStorage.get.mockResolvedValue(testSettings);
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'checkbox',
        checked: false,
        addEventListener: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      require('../../popup/popup.js');
      
      // Wait for async rendering
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockDOM.createElement).toHaveBeenCalledWith('input');
      expect(mockElement.type).toBe('checkbox');
    });

    test('should render text settings', async () => {
      const testSettings = {
        testText: {
          type: 'text',
          value: 'test value',
          description: 'Test text setting',
          maxLength: 100
        }
      };
      
      mockStorage.get.mockResolvedValue(testSettings);
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'text',
        value: '',
        maxLength: 0,
        addEventListener: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      require('../../popup/popup.js');
      
      // Wait for async rendering
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockElement.type).toBe('text');
      expect(mockElement.maxLength).toBe(100);
    });

    test('should render number settings', async () => {
      const testSettings = {
        testNumber: {
          type: 'number',
          value: 42,
          description: 'Test number setting',
          min: 0,
          max: 100
        }
      };
      
      mockStorage.get.mockResolvedValue(testSettings);
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'number',
        value: '',
        min: '',
        max: '',
        addEventListener: jest.fn()
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      require('../../popup/popup.js');
      
      // Wait for async rendering
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockElement.type).toBe('number');
      expect(mockElement.min).toBe('0');
      expect(mockElement.max).toBe('100');
    });
  });

  describe('User Interactions', () => {
    test('should handle setting value changes', async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);
      mockStorage.set.mockResolvedValue();
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'checkbox',
        checked: false,
        addEventListener: jest.fn(),
        dataset: { key: 'testBoolean' }
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      require('../../popup/popup.js');
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Simulate user interaction
      const changeHandler = mockElement.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      mockElement.checked = true;
      changeHandler();
      
      // Wait for async update
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockStorage.set).toHaveBeenCalled();
    });

    test('should validate input values', async () => {
      const testSettings = {
        testNumber: {
          type: 'number',
          value: 50,
          min: 0,
          max: 100
        }
      };
      
      mockStorage.get.mockResolvedValue(testSettings);
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'number',
        value: '150', // Invalid value (over max)
        min: '0',
        max: '100',
        addEventListener: jest.fn(),
        dataset: { key: 'testNumber' }
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      require('../../popup/popup.js');
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Simulate user input with invalid value
      const changeHandler = mockElement.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      changeHandler();
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });
  });

  describe('Export/Import Functionality', () => {
    test('should export settings to file', async () => {
      const testSettings = generateTestSettings();
      mockStorage.get.mockResolvedValue(testSettings);
      
      // Mock URL.createObjectURL
      global.URL = {
        createObjectURL: jest.fn(() => 'blob:mock-url'),
        revokeObjectURL: jest.fn()
      };
      
      // Mock Blob constructor
      global.Blob = jest.fn();
      
      const mockExportButton = {
        addEventListener: jest.fn()
      };
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockImplementation((id) => {
        if (id === 'export-settings') return mockExportButton;
        if (id === 'settings-container') return mockContainer;
        return null;
      });
      
      require('../../popup/popup.js');
      
      // Simulate export button click
      const exportHandler = mockExportButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      exportHandler();
      
      expect(global.Blob).toHaveBeenCalled();
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle file import', async () => {
      const mockFileInput = {
        addEventListener: jest.fn(),
        files: []
      };
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockImplementation((id) => {
        if (id === 'import-settings') return mockFileInput;
        if (id === 'settings-container') return mockContainer;
        return null;
      });
      
      // Mock FileReader
      global.FileReader = jest.fn(() => ({
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: JSON.stringify(generateTestSettings())
      }));
      
      require('../../popup/popup.js');
      
      // Simulate file selection
      const changeHandler = mockFileInput.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      mockFileInput.files = [new File(['{}'], 'settings.json', { type: 'application/json' })];
      changeHandler();
      
      expect(global.FileReader).toHaveBeenCalled();
    });
  });

  describe('Settings Reset', () => {
    test('should reset settings to defaults', async () => {
      mockStorage.get.mockResolvedValue(generateTestSettings());
      mockStorage.clear.mockResolvedValue();
      
      const mockResetButton = {
        addEventListener: jest.fn()
      };
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockImplementation((id) => {
        if (id === 'reset-settings') return mockResetButton;
        if (id === 'settings-container') return mockContainer;
        return null;
      });
      
      // Mock confirm dialog
      global.confirm = jest.fn(() => true);
      
      require('../../popup/popup.js');
      
      // Simulate reset button click
      const resetHandler = mockResetButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      resetHandler();
      
      expect(global.confirm).toHaveBeenCalled();
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    test('should handle reset cancellation', async () => {
      const mockResetButton = {
        addEventListener: jest.fn()
      };
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      mockDOM.getElementById.mockImplementation((id) => {
        if (id === 'reset-settings') return mockResetButton;
        if (id === 'settings-container') return mockContainer;
        return null;
      });
      
      // Mock confirm dialog to return false (cancel)
      global.confirm = jest.fn(() => false);
      
      require('../../popup/popup.js');
      
      // Simulate reset button click
      const resetHandler = mockResetButton.addEventListener.mock.calls.find(
        call => call[0] === 'click'
      )[1];
      
      resetHandler();
      
      expect(global.confirm).toHaveBeenCalled();
      expect(mockStorage.clear).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      mockDOM.getElementById.mockReturnValue(null);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        require('../../popup/popup.js');
      }).not.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    test('should handle storage save errors', async () => {
      mockStorage.get.mockResolvedValue(generateTestSettings());
      mockStorage.set.mockRejectedValue(new Error('Storage full'));
      
      const mockContainer = {
        innerHTML: '',
        appendChild: jest.fn()
      };
      
      const mockElement = {
        type: 'checkbox',
        checked: true,
        addEventListener: jest.fn(),
        dataset: { key: 'testBoolean' }
      };
      
      mockDOM.getElementById.mockReturnValue(mockContainer);
      mockDOM.createElement.mockReturnValue(mockElement);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      require('../../popup/popup.js');
      
      // Wait for initialization
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Simulate user interaction
      const changeHandler = mockElement.addEventListener.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      changeHandler();
      
      // Wait for async update
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });
});