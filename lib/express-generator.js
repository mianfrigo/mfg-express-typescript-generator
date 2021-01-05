const path = require('path');
const editJsonFile = require('edit-json-file');
const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs-extra');
const ora = require('ora');
const ncp = require('ncp').ncp;

const startTime = new Date().getTime();

/**
 * Entry point
 * @param destination
 */
async function expressGenTs(destination) {
  const isWin = process.platform === 'win32';
  try {
    if (!(await fs.pathExists(path.join(process.cwd(), destination)))) {
      await fs.mkdir(destination);
    }
    console.log(
      '\n Bootstrapping Express app in',
      chalk.green(destination),
      '\n'
    );
    const command = isWin ? 'npm.cmd' : 'npm';
    await copyProjectFiles(destination);
    await installingDependencies(
      command,
      ['init', '-y'],
      'Creating Package.json...',
      destination
    );
    updatePackageJson(destination);
    const dep = getDependencies();
    await installingDependencies(
      command,
      ['i', '-s', ...dep.dependencies.split(' ')],
      'Installin dependencies...',
      destination
    );
    await installingDependencies(
      command,
      ['i', '-D', ...dep.devDependencies.split(' ')],
      'Installin dev dependencies...',
      destination
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
  const prjFolder = './express-typescript';
  const source = path.join(__dirname, prjFolder);
  const spinner = ora({
    text: 'Creating file structure...',
    spinner: 'dots',
  }).start();
  return new Promise((resolve, reject) => {
    ncp.limit = 16;
    ncp(source, destination, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      spinner.succeed();
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
  file.set('scripts', {
    start: 'node ./dist/index.js',
    build: 'webpack --config ./webpack.config.js',
    dev: 'webpack --config ./webpack.dev.config.js',
  });
}

/**
 * Get dependencia and dev dependencies
 */
function getDependencies() {
  let dependencies =
    'express express-rate-limit helmet morgan winston dotenv cors auto-bind';
  let devDependencies =
    'ts-node typescript nodemon @types/node @types/express ' +
    '@types/node @types/express @types/cors @types/express-rate-limit @types/morgan ' +
    '@typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-config-airbnb-base ' +
    'eslint-plugin-import nodemon-webpack-plugin prettier ts-loader webpack webpack-cli webpack-node-externals';

  return {
    dependencies,
    devDependencies,
  };
}

/**
 * Instal dependencies / run commands
 * @param {string} command
 * @param {string[]} args
 * @param {string} lodingText
 * @param {string} destination
 */
function installingDependencies(command, args, lodingText, destination) {
  return new Promise((resolve, reject) => {
    const spinner = ora({ text: lodingText, spinner: 'dots' }).start();
    const child = spawn(command, args, { cwd: destination });
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

/**
 * Get destination path
 * @param {string} destFolder
 */
function getDest(destFolder) {
  destFolder = destFolder || 'express-ts';
  return path.join(process.cwd(), destFolder);
}

/**
 * Console log message when app generate process is done
 */
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
  console.groupEnd();
  console.groupEnd();
  console.group();
  console.log(chalk.blue('npm start'));
  console.group();
  console.log(`starts the server (using node)`);
  console.groupEnd();
  console.groupEnd();
  console.log(chalk.yellow('------------------------------------'));

  const endTime = new Date().getTime();
  const timeDifference = (endTime - startTime) / 1000;
  console.log(`App generated in ${timeDifference} seconds`);
}

module.exports = {
  expressGenTs,
  getDest,
  done,
};
