// Playwright configuration.
// Our app is a command-line app, so we only test plain Node.js code.
// That is why there is no browser setting here.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  // Playwright looks for test files only inside this folder.
  testDir: './tests',

  // Only files ending with .spec.js are treated as tests.
  testMatch: '**/*.spec.js',

  // Show one line per test (name + pass/fail) in the terminal.
  reporter: 'list',
});
