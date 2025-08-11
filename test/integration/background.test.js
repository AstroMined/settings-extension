/**
 * Integration tests for background script functionality
 * Tests the service worker behavior and message handling
 */

const { createMockStorage, createMockRuntime } = require('../utils/test-helpers');

// Mock the importScripts function
global.importScripts = jest.fn();

// Mock the imported modules
const mockSettingsManager = {
  initialize: jest.fn(),
  getSetting: jest.fn(),
  updateSetting: jest.fn(),
  getAllSettings: jest.fn(),
  resetToDefaults: jest.fn(),
  initializeWithEmbeddedDefaults: jest.fn()
};

// Mock the SettingsManager constructor
global.SettingsManager = jest.fn(() => mockSettingsManager);

// Don't load background script immediately, load it in beforeEach after setup

describe('Background Script Integration', () => {
  let mockStorage;
  let mockRuntime;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage = createMockStorage();
    mockRuntime = createMockRuntime();
    
    global.browser = {
      storage: { local: mockStorage },
      runtime: mockRuntime,
      tabs: {
        query: jest.fn().mockResolvedValue([]),
        sendMessage: jest.fn().mockResolvedValue()
      }
    };
    
    // Ensure browserAPI is available with same structure as browser
    global.browserAPI = global.browser;
    
    // Load background script after setting up mocks
    require('../../background.js');
  });

  describe('Service Worker Initialization', () => {
    test('should import required scripts on startup', () => {
      expect(global.importScripts).toHaveBeenCalledWith(
        'lib/browser-compat.js',
        'lib/settings-manager.js'
      );
    });

    test('should initialize settings manager successfully', async () => {
      mockSettingsManager.initialize.mockResolvedValue();
      
      // Call initializeSettings directly
      await global.initializeSettings();
      
      expect(mockSettingsManager.initialize).toHaveBeenCalled();
    });

    test('should handle settings manager initialization failure', async () => {
      const error = new Error('Initialization failed');
      mockSettingsManager.initialize.mockRejectedValue(error);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await global.initializeSettings();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to initialize settings manager:',
        error
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Extension Event Handling', () => {
    test('should handle extension installation', async () => {
      const details = { reason: 'install' };
      mockSettingsManager.initialize.mockResolvedValue();
      
      // Simulate chrome.runtime.onInstalled event
      await global.handleInstalled(details);
      
      expect(mockSettingsManager.initialize).toHaveBeenCalled();
    });

    test('should handle extension update', async () => {
      const details = { reason: 'update', previousVersion: '1.0.0' };
      mockSettingsManager.initialize.mockResolvedValue();
      
      await global.handleInstalled(details);
      
      expect(mockSettingsManager.initialize).toHaveBeenCalled();
    });
  });

  describe('Message Handling', () => {
    test('should handle GET_SETTING message', async () => {
      const mockSetting = { type: 'boolean', value: true };
      mockSettingsManager.getSetting.mockResolvedValue(mockSetting);
      
      const message = { type: 'GET_SETTING', key: 'testSetting' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(mockSettingsManager.getSetting).toHaveBeenCalledWith('testSetting');
      expect(sendResponse).toHaveBeenCalledWith({
        value: mockSetting
      });
    });

    test('should handle UPDATE_SETTING message', async () => {
      mockSettingsManager.updateSetting.mockResolvedValue();
      
      const message = {
        type: 'UPDATE_SETTING',
        key: 'testSetting',
        value: false
      };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(mockSettingsManager.updateSetting).toHaveBeenCalledWith('testSetting', false);
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle GET_ALL_SETTINGS message', async () => {
      const mockSettings = { setting1: { value: true }, setting2: { value: 'test' } };
      mockSettingsManager.getAllSettings.mockResolvedValue(mockSettings);
      
      const message = { type: 'GET_ALL_SETTINGS' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(mockSettingsManager.getAllSettings).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({
        settings: mockSettings
      });
    });

    test('should handle RESET_SETTINGS message', async () => {
      mockSettingsManager.resetToDefaults.mockResolvedValue();
      
      const message = { type: 'RESET_SETTINGS' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(mockSettingsManager.resetToDefaults).toHaveBeenCalled();
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle unknown message type', async () => {
      const message = { type: 'UNKNOWN_TYPE' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        error: 'Unknown message type: UNKNOWN_TYPE'
      });
    });

    test('should handle message processing errors', async () => {
      const error = new Error('Processing failed');
      mockSettingsManager.getSetting.mockRejectedValue(error);
      
      const message = { type: 'GET_SETTING', key: 'testSetting' };
      const sender = { tab: { id: 123 } };
      const sendResponse = jest.fn();
      
      await global.handleMessage(message, sender, sendResponse);
      
      expect(sendResponse).toHaveBeenCalledWith({
        error: error.message
      });
    });
  });

  describe('Settings Change Broadcasting', () => {
    test('should broadcast setting changes to all tabs', async () => {
      const tabs = [{ id: 1 }, { id: 2 }, { id: 3 }];
      global.browser.tabs = {
        query: jest.fn().mockResolvedValue(tabs)
      };
      global.browser.tabs.sendMessage = jest.fn().mockResolvedValue();
      
      await global.broadcastSettingsChange({ testSetting: { type: 'boolean', value: false } });
      
      expect(global.browser.tabs.query).toHaveBeenCalledWith({});
      expect(global.browser.tabs.sendMessage).toHaveBeenCalledTimes(3);
      
      tabs.forEach(tab => {
        expect(global.browser.tabs.sendMessage).toHaveBeenCalledWith(tab.id, {
          type: 'SETTINGS_CHANGED',
          changes: { testSetting: { type: 'boolean', value: false } }
        });
      });
    });

    test('should handle broadcasting errors gracefully', async () => {
      const tabs = [{ id: 1 }];
      global.browser.tabs = {
        query: jest.fn().mockResolvedValue(tabs)
      };
      global.browser.tabs.sendMessage = jest.fn().mockRejectedValue(new Error('Tab not found'));
      
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
      
      await global.broadcastSettingsChange({ testSetting: { type: 'boolean', value: false } });
      
      expect(consoleDebugSpy).toHaveBeenCalledWith(
        'Failed to send message to tab 1:',
        'Tab not found'
      );
      consoleDebugSpy.mockRestore();
    });
  });
});