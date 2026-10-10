#!/usr/bin/env node
const { ModKitCli } = require('../dist/index.js');

const cli = new ModKitCli();

cli.run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
