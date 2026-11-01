// ESLint flat config for `npm run lint` (server, shared, client, tests).
import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  { ignores: ['**/node_modules/**', 'client/dist/**', 'tools/**', 'docs/**', 'submission/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }] },
  },
  {
    files: ['**/tests/**/*.js', 'shared/tests/**/*.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
  {
    // Playwright files are CommonJS (see playwright.config.cjs); page.evaluate() code runs in the browser.
    files: ['e2e/**/*.cjs', 'playwright.config.cjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: { ...globals.node, ...globals.browser } },
    rules: { 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none', ignoreRestSiblings: true }] },
  },
  {
    // Performance harness: Playwright page.evaluate() code runs in the browser.
    files: ['scripts/perf/browser.js'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ['client/src/**/*.{js,jsx}', 'shared/src/**/*.js'],
    languageOptions: { globals: { ...globals.browser } },
  },
  {
    files: ['client/src/**/*.jsx'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } }, globals: { ...globals.browser } },
    settings: { react: { version: '18.3' } },
    rules: {
      ...react.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['error', { varsIgnorePattern: '^React$', argsIgnorePattern: '^_', caughtErrors: 'none' }],
    },
  },
];
