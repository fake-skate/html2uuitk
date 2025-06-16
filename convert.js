#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const path = require("path");

const argv = yargs(hideBin(process.argv))
   .option('i', {
    alias: 'input',
    describe: 'Input HTML files',
    demandOption: true,
    type: 'array',
  })
  .option('css', {
    describe: 'CSS files',
    demandOption: true,
    type: 'array',
  })
  .option('reset', {
    describe: 'Reset CSS file',
    type: 'string',
  })
  .option('c', {
    alias: 'config',
    describe: 'Configuration file (JSON)',
    default: path.resolve(__dirname, 'config.json'),
    type: 'string'
  })
  .option('o', {
    alias: 'output',
    describe: 'Output folder',
    demandOption: true,
    type: 'string'
  })
  .help()
  .argv;

require('./index.js')(argv);
