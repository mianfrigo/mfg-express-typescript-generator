#!/usr/bin/env node
const chalk = require('chalk');
const {
  done,
  getProjectPath,
  generateApp,
  pathExist,
} = require('../lib/express-generator');
const { handleArgs } = require('../lib/utilities');

const boxen = require('boxen');

(async () => {
  // Get the name of the new project
  const args = process.argv.slice(2);
  handleArgs(args);
  let withMongo = args[1] && args[1] === '--mongo-db' ? true : false;
  let destination = getProjectPath(args[0]);
  const exist = await pathExist(destination);
  if (exist) {
    console.error(
      chalk.red(
        'The select directory already exist. Please select another name for your project.'
      )
    );
    return;
  }
  console.log(
    boxen('Express typescript generator', {
      borderColor: 'yellow',
      borderStyle: 'classic',
      align: 'left',
    })
  );

  generateApp(destination, withMongo).then(() => {
    done();
  });
})();
