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
      importScripts: "readonly",
      ServiceWorkerGlobalScope: "readonly",
    },
  }),
];
