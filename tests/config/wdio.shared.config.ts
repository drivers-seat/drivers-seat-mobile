export const config: WebdriverIO.Config = {
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      transpileOnly: true
    },
    tsConfigPathsOpts: {
      paths: {},
      baseUrl: './'
    },
  },
  baseUrl: process.env.SERVE_PORT
    ? `http://localhost:${process.env.SERVE_PORT}`
    : `http://localhost:8100`,
  runner: 'local',
  specs: ['./tests/**/*.spec.ts'],
  capabilities: [],
  logLevel: process.env.VERBOSE === 'true' ? 'debug' : 'error',
  bail: 0, // Set to 1 if you want to bail on first failed test
  waitforTimeout: 45000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,
  services: [],
  framework: 'mocha',
  reporters: ['spec'],
  mochaOpts: {
    timeout: 120000
  }
}
