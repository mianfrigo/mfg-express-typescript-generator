const chalk = require('chalk');
const pcg = require('../package.json');
const path = require('path');
const fs = require('fs-extra');

function handleArgs(args) {
  if (args[0] === '-v' || args[0] === '--version') {
    console.log(chalk.yellow(`express-typescript-generator v${pcg.version}`));
    process.exit();
  }
}

async function pathExist(destination) {
  return fs.pathExists(destination);
}

/**
 * Get destination path
 * @param {string} destFolder
 */
function getProjectPath(destFolder) {
  destFolder = destFolder || 'express-ts';
  return path.join(process.cwd(), destFolder);
}

module.exports = {
  handleArgs,
  pathExist,
  getProjectPath,
};
