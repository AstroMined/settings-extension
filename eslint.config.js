const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ["test-user-data-*/**", "coverage/**", "web-ext-artifacts/**"],
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
    },
    globals: {
      chrome: "readonly",
      browser: "readonly",
      browserAPI: "readonly",
      SettingsManager: "readonly",
      ContentScriptSettings: "readonly",
      ConfigurationLoader: "readonly",
      ErrorHandler: "readonly",
      importScripts: "readonly",
      ServiceWorkerGlobalScope: "readonly",
    },
  }),
  // Popup-specific rules to prevent coupling with content scripts
  {
    files: ["popup/**/*.js"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.object.name='browserAPI'][callee.property.name='tabs'][arguments.0.property.name='sendMessage']",
          message:
            "Popup should not use tabs.sendMessage for settings operations. Use runtime.sendMessage to communicate with background script instead.",
        },
        {
          selector:
            "CallExpression[callee.object.object.name='browserAPI'][callee.object.property.name='tabs'][callee.property.name='sendMessage']",
          message:
            "Popup should not use tabs.sendMessage for settings operations. Use runtime.sendMessage to communicate with background script instead.",
        },
        {
          selector:
            "CallExpression[callee.object.name='chrome'][callee.property.name='tabs'][arguments.0.property.name='sendMessage']",
          message:
            "Popup should not use chrome.tabs.sendMessage. Use browserAPI.runtime.sendMessage instead for settings operations.",
        },
      ],
    },
  },
];
