#!/usr/bin/env node

const inquirer = require('inquirer');
const questions = require('../lib/cli-question');
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
  inquirer
    .prompt(questions)
    .then(async (cliAnswers) => {
      console.log('\n');
      console.log(
        boxen('Express typescript generator', {
          borderColor: 'yellow',
          borderStyle: 'classic',
          align: 'left',
        })
      );

      generateApp(destination, cliAnswers).then(() => {
        done();
      });
    })
    .catch((err) => {
      if (err.isTtyError) {
        process.exit();
      } else {
        console.log(err);
      }
    });
})();
