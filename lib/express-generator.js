const path = require('path');
const editJsonFile = require('edit-json-file');
const { spawn } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');
const ncp = require('ncp').ncp;

function getDest(destFolder) {
  destFolder = destFolder || 'express-gen-ts';
  return path.join(process.cwd(), destFolder);
}

function done() {
  console.log(chalk.yellow('------------------------------------'));
  console.log('Begin by typing:');
  console.group();
  console.log(chalk.blue('cd'), process.argv[2]);
  console.log(chalk.blue('npm run dev:server'));
  console.group();
  console.log('starts the development server (using nodemon)');
  console.groupEnd();
  console.log(chalk.blue('npm run build'));
  console.group();
  console.log(`build app for production`);
  console.group();
  console.log(chalk.blue('npm start'));
  console.group();
  console.log(`starts the server (using node)`);
  console.groupEnd();
  console.groupEnd();
  console.log(chalk.yellow('------------------------------------'));

  const endTime = new Date().getTime();
  const timeDifference = (endTime - startTime) / 1000;
  console.log(`Done in ${timeDifference} seconds`);
}

/**
 * Entry point
 * @param destination
 */
async function expressGenTs(destination) {
  try {
    await copyProjectFiles(destination);
    updatePackageJson(destination);
    const dep = getDependencies();
    await installingDependencies(
      'npm',
      ['i', ...dep.dependencies.split(' ')],
      'Installin dependencies...'
    );
    await installingDependencies(
      'npm',
      ['i', '-D', ...dep.dependencies.split(' ')],
      'Installin dev dependencies...'
    );
  } catch (err) {
    console.error(err);
  }
}

/**
 * Copy project files
 * @param destination
 */
function copyProjectFiles(destination) {
  const prjFolder = '../lib/express-typescript';
  const source = path.join(__dirname, prjFolder);
  new Promise((resolve, reject) => {
    ncp.limit = 16;
    ncp(source, destination, function (err) {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

/**
 * Set project name in package.json
 * @param destination
 */
function updatePackageJson(destination) {
  let file = editJsonFile(destination + '/package.json', {
    autosave: true,
  });
  file.set('name', path.basename(destination));
}

function getDependencies() {
  let dependencies =
    'express dotenv morgan helmet cors express-limit-rate winston auto-bind';
  let devDependencies =
    'ts-node typescript nodemon @types/node @types/express' +
    '@types/node @types/express @types/cors @types/express-rate-limit @types/morgan ' +
    '@typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-config-airbnb-base ' +
    'eslint-plugin-import nodemon-webpack-plugin prettier ts-loader webpack webpack-cli webpack-node-externals';

  return {
    dependencies,
    devDependencies,
  };
}

function installingDependencies(command, args, lodingText) {
  return new Promise((resolve, reject) => {
    const spinner = ora({ text: lodingText, spinner: 'dots' }).start();
    const child = spawn(command, args);
    child.on('exit', (code, signal) => {
      if (code) {
        spinner.fail();
        console.log(`Process exit with code: ${code}`);
        reject(`Process exit with code: ${code}`);
      } else if (signal) {
        spinner.fail();
        console.log(`Process exit with signal: ${signal}`);
        reject(`Process exit with signal: ${signal}`);
      } else {
        spinner.succeed();
        resolve();
      }
    });
  });
}

// Export entry point
module.exports = {
  getDest,
  expressGenTs,
  done,
};
