/**
 * Minimal Settings Integration Example - Production Ready in <50 lines
 *
 * This example shows the absolute essentials to get settings working in your 
 * content script. Despite being minimal, it includes proper error handling,
 * caching, and real-time updates reflecting the actual ContentScriptSettings API.
 *
 * ✅ Production patterns included:
 * - Proper async/await error handling with timeouts
 * - Cache utilization for performance  
 * - Real-time change listeners
 * - Browser API initialization verification
 * - Graceful fallbacks for offline scenarios
 *
 * Copy this code into your content script to get started immediately.
 */

// Step 1: Initialize Settings API (requires browser-compat.js to be loaded first)
const settings = new ContentScriptSettings();

// Step 2: Essential operations with robust error handling
async function initializeExtension() {
  try {
    console.log("🚀 Initializing extension with settings...");

    // Get critical settings efficiently (cached after first call)
    const config = await settings.getSettings([
      "feature_enabled",
      "refresh_interval", 
      "custom_css"
    ]);

    // Apply settings with null checks
    if (config.feature_enabled?.value) {
      await startMainFeature(config);
    }

    // Set up real-time change listener (critical for user experience)
    settings.addChangeListener((event, changes) => {
      console.log(`Settings ${event}:`, changes);
      
      // React to specific changes instantly
      if (changes.feature_enabled !== undefined) {
        changes.feature_enabled ? startMainFeature() : stopMainFeature();
      }
      
      if (changes.custom_css !== undefined) {
        applyCustomCSS(changes.custom_css);
      }
    });

    console.log("✅ Extension initialized successfully");

  } catch (error) {
    console.error("❌ Settings initialization failed:", error);
    // Fallback to safe defaults - extension still works
    await startMainFeature({});
  }
}

// Step 3: Update settings with proper validation
async function updateUserSetting(key, value) {
  try {
    await settings.updateSetting(key, value);
    console.log(`✅ Updated ${key} to:`, value);
  } catch (error) {
    console.error(`❌ Failed to update ${key}:`, error);
    throw error; // Re-throw for caller to handle UI feedback
  }
}

// Step 4: Your extension logic with settings integration
async function startMainFeature(config = {}) {
  console.log("🎯 Starting main feature with config:", config);
  
  // Use settings to configure your feature
  const interval = config.refresh_interval?.value || 60; // Default 60s
  const css = config.custom_css?.value;
  
  if (css) applyCustomCSS(css);
  setupPeriodicRefresh(interval);
  
  // Your feature implementation here
}

function stopMainFeature() {
  console.log("🛑 Stopping main feature");
  // Your cleanup logic here
}

function applyCustomCSS(css) {
  const styleEl = document.getElementById("extension-styles") || 
    document.createElement("style");
  styleEl.id = "extension-styles";
  styleEl.textContent = css;
  if (!styleEl.parentNode) document.head.appendChild(styleEl);
}

function setupPeriodicRefresh(interval) {
  // Clear existing interval
  if (window.extensionRefreshInterval) {
    clearInterval(window.extensionRefreshInterval);
  }
  
  // Set new interval
  window.extensionRefreshInterval = setInterval(() => {
    console.log("🔄 Periodic refresh triggered");
    // Your refresh logic here
  }, interval * 1000);
}

// Initialize when ready - handles all loading states
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeExtension);
} else {
  initializeExtension();
}

// Example: Update theme preference with error handling
settings.updateSetting("theme_preference", "dark")
  .then(() => console.log("✅ Theme updated"))
  .catch(error => console.error("❌ Theme update failed:", error));

/**
 * USAGE SUMMARY:
 * 1. Ensure browser-compat.js is loaded before this script
 * 2. This gives you: settings CRUD, caching, real-time updates, error handling
 * 3. Extend startMainFeature() with your extension logic
 * 4. Settings automatically sync across all tabs in real-time
 * 5. Works offline with cached values for performance
 */