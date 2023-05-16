module.exports = {
  roots: ['<rootDir>/src'],
  testRegex: '(/_test_/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?|ts)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testPathIgnorePatterns: ['node_modules'],
  testTimeout: 10000,
  testEnvironment: 'node',
};
