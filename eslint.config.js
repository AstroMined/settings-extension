const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: [
      "test-user-data-*/**",
      "coverage/**",
      "web-ext-artifacts/**",
      "dist/**",
      "examples/**",
    ],
  },
  ...compat.config({
    env: {
      browser: true,
      node: true,
      es2021: true,
      webextensions: true,
      jest: true,
    },
    extends: ["eslint:recommended", "prettier"],
    plugins: ["jest", "prettier"],
    parserOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "prettier/prettier": "error",
      "no-console": "off",
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-globals": [
        "error",
        {
          name: "chrome",
          message:
            "Use browserAPI from lib/browser-compat.js instead of direct chrome API calls",
        },
        {
          name: "browser",
          message:
            "Use browserAPI from lib/browser-compat.js instead of direct browser API calls",
        },
      ],
    },
    globals: {
      chrome: "readonly",
      browser: "readonly",
      browserAPI: "readonly",
      SettingsManager: "readonly",
      ContentScriptSettings: "readonly",
      ConfigurationLoader: "readonly",
      ErrorHandler: "readonly",
      StorageOperationManager: "readonly",
      StorageErrors: "readonly",
      StorageLogger: "readonly",
      SaveStatusIndicator: "readonly",
      importScripts: "readonly",
      ServiceWorkerGlobalScope: "readonly",
    },
  }),
  // Exception for browser-compat.js - allow direct API usage
  {
    files: ["**/browser-compat.js"],
    rules: {
      "no-restricted-globals": "off",
    },
  },
  // Popup-specific rules to prevent coupling with content scripts
  {
    files: ["src/ui/popup/**/*.js"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.object.name='browserAPI'][callee.object.property.name='tabs'][callee.property.name='sendMessage']",
          message:
            "Popup should not use browserAPI.tabs.sendMessage for settings operations. Use browserAPI.runtime.sendMessage to communicate with background script instead.",
        },
      ],
    },
  },
];
