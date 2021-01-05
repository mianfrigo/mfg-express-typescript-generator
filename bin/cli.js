#!/usr/bin/env node
const chalk = require('chalk');
const {
  done,
  getDest,
  expressGenTs,
  pathExist,
} = require('../lib/express-generator');

const boxen = require('boxen');

(async () => {
  // Get the name of the new project
  const args = process.argv.slice(2);
  if (args[0] === '--mongo-db') {
    console.error(
      chalk.red(
        'project name most be follow by the params eg. "node-express --mongo-db"'
      )
    );
    return;
  }
  let withMongo = args[1] && args[1] === '--mongo-db' ? true : false;
  let destination = getDest(args[0]);
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

  expressGenTs(destination, withMongo).then(() => {
    done();
  });
})();
