// Jest runs native ES modules (node --experimental-vm-modules), no transpilation.
const common = { testEnvironment: 'node', transform: {} };

export default {
  projects: [
    {
      ...common,
      displayName: 'unit',
      testMatch: [
        '<rootDir>/shared/tests/**/*.test.js',
        '<rootDir>/server/tests/unit/**/*.test.js',
        '<rootDir>/client/tests/**/*.test.js',
      ],
    },
    {
      ...common,
      displayName: 'integration',
      testMatch: ['<rootDir>/server/tests/integration/**/*.test.js'],
      globalSetup: '<rootDir>/server/tests/helpers/globalSetup.js',
      globalTeardown: '<rootDir>/server/tests/helpers/globalTeardown.js',
      testTimeout: 120000,
    },
  ],
};
