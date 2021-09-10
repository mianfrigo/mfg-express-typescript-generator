#!/usr/bin/env node

const inquirer = require('inquirer');
const questions = require('../lib/cli-question');
const chalk = require('chalk');
const { done, generateApp } = require('../lib/express-generator');
const { handleArgs, getProjectPath, pathExists } = require('../lib/utilities');

const boxen = require('boxen');

(async () => {
  // Get the name of the new project
  const args = process.argv.slice(2);
  handleArgs(args);
  let destination = getProjectPath(args[0]);
  try {
    const exist = await pathExists(destination);
    if (exist) {
      console.error(
        chalk.red(
          'The select directory already exist. Please select another name for your project.'
        )
      );
      return;
    }
  } catch (err) {
    console.error(err);
    process.exit();
  }
  inquirer
    .prompt(questions)
    .then(async (cliAnswers) => {
      try {
        console.log('\n');
        console.log(
          boxen('Express typescript generator', {
            borderColor: 'yellow',
            borderStyle: 'classic',
            align: 'left',
          })
        );
        await generateApp(destination, cliAnswers);
        done();
      } catch (err) {
        console.error(err);
        process.exit();
      }
    })
    .catch((err) => {
      if (err.isTtyError) {
        process.exit();
      } else {
        console.error(err);
      }
    });
})();
