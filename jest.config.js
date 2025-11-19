module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/server.js',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/test/',
  ],
  verbose: true,
  testTimeout: 30000,
}

