/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tests/tsconfig.json' }],
  },
  moduleNameMapper: {
    '^puppeteer$': '<rootDir>/../surge2egern/node_modules/puppeteer',
    '@nsnanocat/arguments-builder': '<rootDir>/src/index.ts',
  },
};
