/**
 * Minimal Settings Integration Example
 *
 * Complete working example in <50 lines showing just the essentials
 * to get started with the Settings Extension API in your own extension.
 *
 * This example demonstrates:
 * - Basic initialization with proper browserAPI setup
 * - Essential CRUD operations with error handling
 * - Real-time change listeners
 * - Promise-based patterns
 *
 * Copy this code into your content script to get started immediately.
 */

// Step 1: Initialize settings API (browserAPI is loaded via browser-compat.js)
const settings = new ContentScriptSettings();

// Step 2: Basic operations with error handling
async function initializeExtension() {
  try {
    // Get single setting
    const feature = await settings.getSetting("feature_enabled");
    console.log("Feature enabled:", feature.value);

    // Get multiple settings efficiently
    const config = await settings.getSettings([
      "api_endpoint",
      "refresh_interval",
      "user_preferences",
    ]);

    // Use settings to configure your extension
    if (feature.value) {
      startMainFeature(config);
    }

    // Step 3: Listen for real-time changes
    settings.addChangeListener((event, changes) => {
      console.log("Settings changed:", event, changes);

      // React to specific setting changes
      if (changes.feature_enabled !== undefined) {
        changes.feature_enabled ? startMainFeature() : stopMainFeature();
      }
    });
  } catch (error) {
    console.error("Settings initialization failed:", error);
    // Fallback to default behavior
    startMainFeature({});
  }
}

// Step 4: Update settings when needed
async function updateUserPreference(key, value) {
  try {
    await settings.updateSetting(key, value);
    console.log(`Updated ${key} to:`, value);
  } catch (error) {
    console.error(`Failed to update ${key}:`, error);
  }
}

// Step 5: Your extension logic
function startMainFeature(config = {}) {
  console.log("Starting main feature with config:", config);
  // Your feature implementation here
}

function stopMainFeature() {
  console.log("Stopping main feature");
  // Your cleanup logic here
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}
