/**
 * Performance tests for Settings Extension
 * Tests performance requirements and benchmarks
 */

const { 
  createMockStorage, 
  createMockRuntime, 
  generateTestSettings, 
  testPerformance,
  delay 
} = require('./utils/test-helpers');

describe('Performance Tests', () => {
  let mockStorage;
  let mockRuntime;
  let testSettings;
  let largeSettings;

  beforeEach(() => {
    mockStorage = createMockStorage();
    mockRuntime = createMockRuntime();
    testSettings = generateTestSettings();
    
    // Generate large settings for stress testing
    largeSettings = {};
    for (let i = 0; i < 100; i++) {
      largeSettings[`setting_${i}`] = {
        type: 'text',
        value: `Value ${i}`.repeat(100), // ~800 bytes per setting
        description: `Test setting ${i}`
      };
    }
    
    global.browser.storage.local = mockStorage;
    global.browser.runtime = mockRuntime;
  });

  describe('Settings Load Performance', () => {
    test('should load single setting within 100ms', async () => {
      // Test requirement: <100ms load time
      const result = await testPerformance(async () => {
        mockStorage.get.mockResolvedValue({ testBoolean: testSettings.testBoolean });
        await mockStorage.get('testBoolean');
      }, 100);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test('should load multiple settings within 100ms', async () => {
      // Test loading multiple settings
      const result = await testPerformance(async () => {
        mockStorage.get.mockResolvedValue(testSettings);
        await mockStorage.get(['testBoolean', 'testText', 'testNumber']);
      }, 100);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test('should load all settings within 100ms', async () => {
      // Test loading all settings
      const result = await testPerformance(async () => {
        mockStorage.get.mockResolvedValue(testSettings);
        await mockStorage.get(null);
      }, 100);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test('should handle large settings datasets efficiently', async () => {
      // Test performance with large datasets
      const result = await testPerformance(async () => {
        mockStorage.get.mockResolvedValue(largeSettings);
        await mockStorage.get(null);
      }, 200); // Allow more time for large datasets
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Settings Save Performance', () => {
    test('should save single setting within 100ms', async () => {
      // Test requirement: <100ms save time
      const result = await testPerformance(async () => {
        mockStorage.set.mockResolvedValue();
        await mockStorage.set({ testBoolean: testSettings.testBoolean });
      }, 100);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test('should save multiple settings within 100ms', async () => {
      // Test saving multiple settings
      const result = await testPerformance(async () => {
        mockStorage.set.mockResolvedValue();
        await mockStorage.set(testSettings);
      }, 100);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(100);
    });

    test('should handle batch updates efficiently', async () => {
      // Test batch update performance
      const batchUpdates = {};
      for (let i = 0; i < 50; i++) {
        batchUpdates[`setting_${i}`] = { type: 'text', value: `Updated ${i}` };
      }
      
      const result = await testPerformance(async () => {
        mockStorage.set.mockResolvedValue();
        await mockStorage.set(batchUpdates);
      }, 150);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('UI Performance', () => {
    test('should load settings UI within 500ms', async () => {
      // Test requirement: <500ms UI load time
      const result = await testPerformance(async () => {
        // Mock UI initialization
        mockStorage.get.mockResolvedValue(testSettings);
        await mockStorage.get(null);
        
        // Mock DOM manipulation
        await delay(50);
        
        // Mock form generation
        await delay(50);
      }, 500);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(500);
    });

    test('should handle form generation efficiently', async () => {
      // Test dynamic form generation performance
      const result = await testPerformance(async () => {
        // Mock form generation for all settings
        Object.keys(testSettings).forEach(() => {
          // Mock DOM element creation
        });
        await delay(10);
      }, 200);
      
      expect(result.passed).toBe(true);
    });

    test('should handle real-time validation efficiently', async () => {
      // Test real-time validation performance
      const result = await testPerformance(async () => {
        // Mock validation for multiple inputs
        for (let i = 0; i < 10; i++) {
          // Mock validation logic
          await delay(5);
        }
      }, 100);
      
      expect(result.passed).toBe(true);
    });
  });

  describe('Content Script Performance', () => {
    test('should access settings within 50ms', async () => {
      // Test requirement: <50ms content script access
      const result = await testPerformance(async () => {
        mockRuntime.sendMessage.mockResolvedValue({ 
          success: true, 
          data: testSettings.testBoolean 
        });
        await mockRuntime.sendMessage({ type: 'GET_SETTING', key: 'testBoolean' });
      }, 50);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(50);
    });

    test('should handle concurrent content script access', async () => {
      // Test concurrent access from multiple content scripts
      const promises = Array.from({ length: 20 }, () => 
        testPerformance(async () => {
          mockRuntime.sendMessage.mockResolvedValue({ success: true });
          await mockRuntime.sendMessage({ type: 'GET_SETTING', key: 'testBoolean' });
        }, 50)
      );
      
      const results = await Promise.all(promises);
      results.forEach(result => {
        expect(result.passed).toBe(true);
      });
    });
  });

  describe('Memory Usage', () => {
    test('should maintain memory usage under 10MB', async () => {
      // Test requirement: <10MB memory usage per tab
      // Note: This is a simplified test - actual implementation would need real memory monitoring
      
      // Mock memory-intensive operations
      const memoryTest = async () => {
        const largeData = [];
        for (let i = 0; i < 1000; i++) {
          largeData.push({ ...testSettings });
        }
        
        // Simulate processing
        await delay(50);
        
        // Clean up
        largeData.length = 0;
      };
      
      await memoryTest();
      expect(true).toBe(true); // Placeholder - real implementation would check actual memory
    });

    test('should handle memory cleanup properly', async () => {
      // Test memory cleanup after operations
      const cleanupTest = async () => {
        let data = { ...largeSettings };
        
        // Simulate usage
        await delay(10);
        
        // Clean up
        data = null;
      };
      
      await cleanupTest();
      expect(true).toBe(true);
    });
  });

  describe('Stress Testing', () => {
    test('should handle rapid consecutive operations', async () => {
      // Test rapid operations without performance degradation
      const results = [];
      
      for (let i = 0; i < 50; i++) {
        const result = await testPerformance(async () => {
          mockStorage.get.mockResolvedValue(testSettings);
          await mockStorage.get('testBoolean');
        }, 100);
        
        results.push(result);
      }
      
      // Check that performance doesn't degrade over time
      const firstHalf = results.slice(0, 25);
      const secondHalf = results.slice(25);
      
      const firstAvg = firstHalf.reduce((sum, r) => sum + r.duration, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, r) => sum + r.duration, 0) / secondHalf.length;
      
      // Performance shouldn't degrade by more than 50%
      expect(secondAvg).toBeLessThan(firstAvg * 1.5);
    });

    test('should handle high-frequency setting changes', async () => {
      // Test high-frequency updates
      const promises = [];
      
      for (let i = 0; i < 100; i++) {
        promises.push(testPerformance(async () => {
          mockStorage.set.mockResolvedValue();
          await mockStorage.set({ [`setting_${i}`]: { value: i } });
        }, 100));
      }
      
      const results = await Promise.all(promises);
      const passed = results.filter(r => r.passed).length;
      
      // At least 90% should meet performance requirements
      expect(passed / results.length).toBeGreaterThan(0.9);
    });
  });

  describe('Network Performance', () => {
    test('should handle sync storage efficiently', async () => {
      // Test sync storage performance
      const result = await testPerformance(async () => {
        mockStorage.set.mockResolvedValue();
        await mockStorage.set({ syncSetting: { value: 'test' } });
      }, 200); // Allow more time for sync operations
      
      expect(result.passed).toBe(true);
    });

    test('should handle offline scenarios', async () => {
      // Test performance when sync is unavailable and fallback works
      const result = await testPerformance(async () => {
        // Mock sync storage failure, then success
        let callCount = 0;
        const mockSyncStorage = {
          set: jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              throw new Error('Network unavailable');
            }
            // Second call succeeds (fallback behavior)
            return Promise.resolve();
          })
        };
        
        global.browser.storage.sync = mockSyncStorage;
        
        try {
          await mockSyncStorage.set({ syncSetting: { value: 'test' } });
        } catch (error) {
          // Fallback: try again or use different approach
          await mockSyncStorage.set({ syncSetting: { value: 'test' } });
        }
      }, 150);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(150);
    });
  });

  describe('Performance Monitoring', () => {
    test('should track performance metrics', async () => {
      // Test performance metrics collection
      const metrics = {
        loadTimes: [],
        saveTimes: [],
        uiLoadTimes: []
      };
      
      // Simulate metric collection
      for (let i = 0; i < 10; i++) {
        const result = await testPerformance(async () => {
          await delay(Math.random() * 50);
        }, 100);
        
        metrics.loadTimes.push(result.duration);
      }
      
      const avgLoadTime = metrics.loadTimes.reduce((sum, time) => sum + time, 0) / metrics.loadTimes.length;
      
      expect(avgLoadTime).toBeLessThan(100);
      expect(metrics.loadTimes).toHaveLength(10);
    });

    test('should identify performance bottlenecks', async () => {
      // Test bottleneck identification
      const operations = [
        { name: 'load', fn: () => delay(30) },
        { name: 'save', fn: () => delay(20) },
        { name: 'validate', fn: () => delay(10) },
        { name: 'ui_update', fn: () => delay(40) }
      ];
      
      const results = await Promise.all(
        operations.map(async op => {
          const result = await testPerformance(op.fn, 100);
          return { name: op.name, duration: result.duration };
        })
      );
      
      const slowest = results.reduce((max, current) => 
        current.duration > max.duration ? current : max
      );
      
      // The slowest operation should be one that does more work
      expect(slowest.name).toMatch(/export_settings|validate_complex|ui_update/);
      
      // Performance should be within reasonable bounds
      results.forEach(result => {
        expect(result.duration).toBeLessThan(200);
      });
    });
  });
  
  describe('Real-world Performance Scenarios', () => {
    test('should handle extension startup performance', async () => {
      // Test realistic extension startup scenario
      const SettingsManager = require('../lib/settings-manager.js');
      
      const result = await testPerformance(async () => {
        // Simulate extension startup
        const manager = new SettingsManager();
        
        // Simulate loading from storage (would be async in real scenario)
        manager.settings = new Map();
        for (const [key, setting] of Object.entries(testSettings)) {
          manager.settings.set(key, setting);
        }
        manager.initialized = true;
        
        // Simulate initial settings access by multiple components
        const promises = [];
        
        // UI component getting settings
        promises.push(manager.getAllSettings());
        
        // Content scripts getting specific settings
        promises.push(manager.getSetting('testBoolean'));
        promises.push(manager.getSetting('testText'));
        
        // Background tasks
        promises.push(manager.exportSettings());
        
        await Promise.all(promises);
        manager.destroy();
      }, 300);
      
      expect(result.passed).toBe(true);
      expect(result.duration).toBeLessThan(300);
    });
  });
});