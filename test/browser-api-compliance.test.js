/**
 * Browser API Abstraction Compliance Tests
 * Ensures no direct chrome.* or browser.* API usage outside browser-compat.js
 */

const fs = require("fs");
const path = require("path");
const { glob } = require("glob");

describe("Browser API Abstraction Compliance", () => {
  let sourceFiles = [];

  beforeAll(async () => {
    // Get all JavaScript files except browser-compat.js and test files
    const allFiles = await glob("src/**/*.js", {
      cwd: path.join(__dirname, ".."),
      absolute: true,
    });

    sourceFiles = allFiles.filter(
      (file) =>
        !file.includes("browser-compat.js") &&
        !file.includes("test/") &&
        !file.includes("node_modules/"),
    );
  });

  test("should not contain direct chrome.* API calls outside browser-compat.js", async () => {
    const violations = [];
    const chromeApiPattern = /\bchrome\./g;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const matches = line.match(chromeApiPattern);
        if (matches) {
          // Skip comments and string literals that might contain chrome.* references
          const trimmedLine = line.trim();
          if (
            !trimmedLine.startsWith("//") &&
            !trimmedLine.startsWith("*") &&
            !trimmedLine.includes('"chrome.') &&
            !trimmedLine.includes("'chrome.")
          ) {
            violations.push({
              file: path.relative(path.join(__dirname, ".."), file),
              line: index + 1,
              content: line.trim(),
              matches: matches,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const errorMessage = violations
        .map((v) => `${v.file}:${v.line} - ${v.content}`)
        .join("\n");
      throw new Error(
        `Found direct chrome.* API usage:\n${errorMessage}\n\nUse browserAPI from lib/browser-compat.js instead.`,
      );
    }
  });

  test("should not contain direct browser.* API calls outside browser-compat.js", async () => {
    const violations = [];
    const browserApiPattern = /\bbrowser\./g;

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const matches = line.match(browserApiPattern);
        if (matches) {
          // Skip comments and string literals that might contain browser.* references
          const trimmedLine = line.trim();
          if (
            !trimmedLine.startsWith("//") &&
            !trimmedLine.startsWith("*") &&
            !trimmedLine.includes('"browser.') &&
            !trimmedLine.includes("'browser.")
          ) {
            violations.push({
              file: path.relative(path.join(__dirname, ".."), file),
              line: index + 1,
              content: line.trim(),
              matches: matches,
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const errorMessage = violations
        .map((v) => `${v.file}:${v.line} - ${v.content}`)
        .join("\n");
      throw new Error(
        `Found direct browser.* API usage:\n${errorMessage}\n\nUse browserAPI from lib/browser-compat.js instead.`,
      );
    }
  });

  test("should use browserAPI for all extension API calls", async () => {
    const missingBrowserAPI = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");

      // Check if file uses extension APIs but doesn't import browserAPI
      // More precise pattern - look for actual API calls, not just property access
      const hasExtensionApiUsage =
        /\b(browserAPI\.(storage|runtime|tabs|action|alarms)|storage\.(local|sync)|runtime\.(sendMessage|onMessage)|tabs\.(query|sendMessage)|action\.(setIcon|setTitle)|alarms\.(create|clear))/g.test(
          content,
        );
      const hasBrowserAPIImport =
        content.includes("browserAPI") || content.includes("browser-compat");

      if (hasExtensionApiUsage && !hasBrowserAPIImport) {
        missingBrowserAPI.push({
          file: path.relative(path.join(__dirname, ".."), file),
          reason: "Uses extension APIs but doesn't import browserAPI",
        });
      }
    }

    if (missingBrowserAPI.length > 0) {
      const errorMessage = missingBrowserAPI
        .map((v) => `${v.file} - ${v.reason}`)
        .join("\n");
      throw new Error(
        `Files using extension APIs without browserAPI:\n${errorMessage}`,
      );
    }
  });

  test("popup should not use tabs.sendMessage for settings operations", async () => {
    const popupFiles = await glob("src/ui/popup/**/*.js", {
      cwd: path.join(__dirname, ".."),
      absolute: true,
    });

    const violations = [];
    const tabsSendMessagePattern = /\.tabs\.sendMessage\s*\(/g;

    for (const file of popupFiles) {
      const content = fs.readFileSync(file, "utf8");
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        if (tabsSendMessagePattern.test(line)) {
          // Allow tabs.sendMessage for non-settings operations (like opening tabs)
          // Check if this is a settings-related operation
          const isSettingsOperation = /settings|SET_|GET_|SAVE_|LOAD_/i.test(
            line,
          );

          if (isSettingsOperation) {
            violations.push({
              file: path.relative(path.join(__dirname, ".."), file),
              line: index + 1,
              content: line.trim(),
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const errorMessage = violations
        .map((v) => `${v.file}:${v.line} - ${v.content}`)
        .join("\n");
      throw new Error(
        `Popup using tabs.sendMessage for settings operations:\n${errorMessage}\n\nUse browserAPI.runtime.sendMessage instead.`,
      );
    }
  });

  test("should have proper browserAPI imports where needed", async () => {
    const importViolations = [];

    for (const file of sourceFiles) {
      const content = fs.readFileSync(file, "utf8");

      // Check for browserAPI usage
      const usesBrowserAPI = /\bbrowserAPI\./g.test(content);
      const hasImportScript = /importScripts.*browser-compat/g.test(content);
      const hasImportStatement =
        /import.*browser-compat|require.*browser-compat/g.test(content);
      const isHTMLFile = file.endsWith(".html");
      const relativeFile = path.relative(path.join(__dirname, ".."), file);

      // Skip files that have valid alternative access to browserAPI:
      // - UI files: get browserAPI from HTML script tags
      // - Content scripts: get browserAPI from manifest content_scripts injection
      // - config-loader: has getBrowserAPI() method that accesses global scope
      const isUIFile =
        relativeFile.includes("ui/") ||
        relativeFile.includes("popup/") ||
        relativeFile.includes("options/");
      const isContentScript = relativeFile.includes("content/");
      const hasGlobalBrowserAPIAccessor = /getBrowserAPI\s*\(/g.test(content);

      if (
        usesBrowserAPI &&
        !hasImportScript &&
        !hasImportStatement &&
        !isHTMLFile &&
        !isUIFile &&
        !isContentScript &&
        !hasGlobalBrowserAPIAccessor
      ) {
        importViolations.push({
          file: path.relative(path.join(__dirname, ".."), file),
          reason: "Uses browserAPI but doesn't import browser-compat.js",
        });
      }
    }

    if (importViolations.length > 0) {
      const errorMessage = importViolations
        .map((v) => `${v.file} - ${v.reason}`)
        .join("\n");
      throw new Error(`Missing browserAPI imports:\n${errorMessage}`);
    }
  });
});
