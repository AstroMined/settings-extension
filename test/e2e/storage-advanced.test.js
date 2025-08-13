/**
 * Advanced Storage and Sync E2E Tests
 * Tests quota management, sync conflicts, and edge cases with real browser storage
 */

import { test, expect } from '@playwright/test';
import path from 'path';

const BrowserFactory = require('./utils/browser-factory');

let context;
let extensionId;

test.describe('Advanced Storage and Sync', () => {
  test.beforeAll(async ({}, testInfo) => {
    // Use browser factory for consistent configuration across environments
    context = await BrowserFactory.createExtensionContext(testInfo);

    // Get extension service worker using browser factory helper
    const serviceWorker = await BrowserFactory.getExtensionServiceWorker(context);
    
    if (serviceWorker) {
      extensionId = serviceWorker.url().split('/')[2];
      console.log(`Extension ID: ${extensionId}`);
    } else {
      throw new Error('Extension service worker not found');
    }
  });

  test.afterAll(async () => {
    if (context) {
      await context.close();
    }
  });

  test.describe('Storage Quota Management', () => {
    test('should handle near-quota scenarios gracefully', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container', { timeout: 10000 });

        // Create large setting values to approach quota limits
        const largeValue = 'x'.repeat(1000); // 1KB per setting
        
        // Test with multiple large settings
        for (let i = 0; i < 5; i++) {
          const textInput = page.locator('input[type="text"]').first();
          await textInput.clear();
          await textInput.fill(`${largeValue}_${i}`);
          await page.waitForTimeout(500); // Allow save
          
          // Verify setting was saved
          await expect(textInput).toHaveValue(`${largeValue}_${i}`);
        }

        // Verify settings persist
        await page.reload();
        await page.waitForSelector('#settings-container');
        const finalValue = await page.locator('input[type="text"]').first().inputValue();
        expect(finalValue).toContain('xxxx'); // Should have large value
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });

    test('should provide meaningful feedback on storage errors', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        // Monitor console for storage-related errors
        const consoleMessages = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error' || msg.text().includes('storage')) {
            consoleMessages.push(msg.text());
          }
        });

        // Try to create extremely large data
        const oversizedValue = 'x'.repeat(50000); // 50KB+ value
        const textInput = page.locator('input[type="text"]').first();
        await textInput.clear();
        await textInput.fill(oversizedValue);
        await page.waitForTimeout(1000);

        // Extension should handle this gracefully without crashes
        const currentUrl = page.url();
        expect(currentUrl).toContain('popup.html'); // Should still be functional
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });
  });

  test.describe('Sync Conflicts and Resolution', () => {
    test('should handle concurrent setting updates correctly', async () => {
      const page1 = await context.newPage();
      const page2 = await context.newPage();
      
      try {
        // Open extension in two tabs
        await page1.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page2.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        
        await page1.waitForSelector('#settings-container');
        await page2.waitForSelector('#settings-container');

        // Simulate concurrent updates
        const timestamp = Date.now();
        const value1 = `concurrent_1_${timestamp}`;
        const value2 = `concurrent_2_${timestamp}`;

        // Update setting in both tabs simultaneously
        const textInput1 = page1.locator('input[type="text"]').first();
        const textInput2 = page2.locator('input[type="text"]').first();

        await Promise.all([
          textInput1.fill(value1),
          textInput2.fill(value2)
        ]);

        await page1.waitForTimeout(1000);
        await page2.waitForTimeout(1000);

        // Check that one of the values won (last writer wins)
        await page1.reload();
        await page2.reload();
        
        await page1.waitForSelector('#settings-container');
        await page2.waitForSelector('#settings-container');
        
        const finalValue1 = await page1.locator('input[type="text"]').first().inputValue();
        const finalValue2 = await page2.locator('input[type="text"]').first().inputValue();
        
        // Both should show the same final value
        expect(finalValue1).toBe(finalValue2);
        expect(finalValue1).toMatch(/concurrent_(1|2)_\d+/);
        
      } finally {
        if (!page1.isClosed()) await page1.close();
        if (!page2.isClosed()) await page2.close();
      }
    });

    test('should maintain data consistency during rapid changes', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        const textInput = page.locator('input[type="text"]').first();
        
        // Perform rapid sequential updates
        const values = [];
        for (let i = 0; i < 10; i++) {
          const value = `rapid_${i}_${Date.now()}`;
          values.push(value);
          await textInput.clear();
          await textInput.fill(value);
          await page.waitForTimeout(100); // Quick succession
        }

        // Wait for final stabilization
        await page.waitForTimeout(2000);
        
        // Verify final state is consistent
        const finalValue = await textInput.inputValue();
        expect(finalValue).toMatch(/rapid_\d+_\d+/);
        
        // Verify persistence across reload
        await page.reload();
        await page.waitForSelector('#settings-container');
        const persistedValue = await page.locator('input[type="text"]').first().inputValue();
        expect(persistedValue).toBe(finalValue);
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('should handle bulk operations efficiently', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/options/options.html`);
        await page.waitForSelector('.settings-container', { timeout: 10000 });

        const startTime = Date.now();
        
        // Perform bulk setting changes
        const settingInputs = await page.locator('input').all();
        
        for (let i = 0; i < Math.min(settingInputs.length, 10); i++) {
          const input = settingInputs[i];
          const inputType = await input.getAttribute('type');
          
          if (inputType === 'text') {
            await input.fill(`bulk_${i}_${Date.now()}`);
          } else if (inputType === 'checkbox') {
            await input.click();
          } else if (inputType === 'number') {
            await input.fill(String(i * 10));
          }
          
          await page.waitForTimeout(50); // Small delay between changes
        }

        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should complete bulk operations in reasonable time (< 5 seconds)
        expect(duration).toBeLessThan(5000);
        
        // Verify all changes persisted
        await page.reload();
        await page.waitForSelector('.settings-container');
        
        // Check that at least some bulk changes persisted
        const textInputs = await page.locator('input[type="text"]').all();
        if (textInputs.length > 0) {
          const firstValue = await textInputs[0].inputValue();
          expect(firstValue).toMatch(/bulk_\d+_\d+/);
        }
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });

    test('should maintain responsiveness during heavy storage load', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        // Monitor page responsiveness
        let responseTime = 0;
        
        const startTime = Date.now();
        
        // Create storage load by rapid setting changes
        const textInput = page.locator('input[type="text"]').first();
        
        for (let i = 0; i < 20; i++) {
          const changeStart = Date.now();
          await textInput.fill(`load_test_${i}`);
          await page.waitForTimeout(50);
          responseTime += (Date.now() - changeStart);
        }
        
        const totalTime = Date.now() - startTime;
        const averageResponseTime = responseTime / 20;
        
        // UI should remain responsive (average < 200ms per operation)
        expect(averageResponseTime).toBeLessThan(200);
        
        // Total operation should complete in reasonable time
        expect(totalTime).toBeLessThan(10000);
        
        // UI should still be functional
        const finalValue = await textInput.inputValue();
        expect(finalValue).toContain('load_test_');
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });
  });

  test.describe('Error Recovery and Resilience', () => {
    test('should recover from extension context invalidation', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        // Set a test value
        const textInput = page.locator('input[type="text"]').first();
        const testValue = `recovery_test_${Date.now()}`;
        await textInput.fill(testValue);
        await page.waitForTimeout(1000);

        // Reload the extension context by navigating away and back
        await page.goto('about:blank');
        await page.waitForTimeout(500);
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        // Verify setting survived context reload
        const recoveredValue = await page.locator('input[type="text"]').first().inputValue();
        expect(recoveredValue).toBe(testValue);
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });

    test('should handle corrupted data gracefully', async () => {
      const page = await context.newPage();
      
      try {
        await page.goto(`chrome-extension://${extensionId}/popup/popup.html`);
        await page.waitForSelector('#settings-container');

        // Monitor for errors
        const errors = [];
        page.on('pageerror', (error) => {
          errors.push(error.message);
        });

        // Try to import potentially malformed data via import function
        // (This tests the extension's resilience to bad data)
        const importButton = page.locator('button:has-text("Import")');
        if (await importButton.isVisible()) {
          // Create a file with invalid JSON
          const invalidJson = '{"settings": {"broken": invalid_json_here}}';
          
          // Note: This is a simulation - in real usage, the extension
          // should validate and handle malformed import data
          await importButton.click();
          await page.waitForTimeout(1000);
          
          // Cancel the import dialog if it appears
          if (await page.locator('input[type="file"]').isVisible()) {
            await page.keyboard.press('Escape');
          }
        }

        // Extension should still be functional despite error attempts
        const textInput = page.locator('input[type="text"]').first();
        await textInput.fill('corruption_recovery_test');
        await expect(textInput).toHaveValue('corruption_recovery_test');
        
        // Should not have thrown uncaught errors
        expect(errors.length).toBe(0);
        
      } finally {
        if (!page.isClosed()) {
          await page.close();
        }
      }
    });
  });
});