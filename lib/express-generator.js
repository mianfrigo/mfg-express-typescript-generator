const path = require('path');
const editJsonFile = require('edit-json-file');
const { spawn } = require('child_process');
const chalk = require('chalk');
const fs = require('fs-extra');
const ora = require('ora');
const ncp = require('ncp').ncp;
const { pathExist } = require('./utilities');

const startTime = new Date().getTime();
const urlOpt = './template-options/';

/**
 * Entry point
 * @param destination
 */
async function generateApp(destination, cliAnswers) {
  const isWin = process.platform === 'win32';
  try {
    if (!(await pathExist(destination))) {
      await fs.mkdir(destination);
    }
    console.log(
      '\n Bootstrapping Express app in',
      chalk.green(destination),
      '\n'
    );
    const command = isWin ? 'npm.cmd' : 'npm';
    await copyBaseFiles(destination, cliAnswers);
    await installDependencies(
      command,
      ['init', '-y'],
      'Creating Package.json...',
      destination
    );
    updatePackageJson(destination);
    const spinnerLimiter = ora({
      text: cliAnswers.withLimiter
        ? 'Setting up limiters...'
        : 'Setting up routes...',
      spinner: 'dots',
    }).start();
    try {
      await copyRouteFiles(destination, spinnerLimiter, cliAnswers);
      spinnerLimiter.succeed();
    } catch (error) {
      spinnerLimiter.fail();
    }
    if (cliAnswers.withMongo) {
      await copyMongoFilesCliOptions(destination, cliAnswers);
    }
    if (cliAnswers.withAuthRoute) {
      const spinnerAuth = ora({
        text: 'Setting up authentication route...',
        spinner: 'dots',
      }).start();
      try {
        await copyAuthFile(destination, spinnerAuth, cliAnswers);
        spinnerAuth.succeed();
      } catch (error) {
        spinnerAuth.fail();
      }
    }
    const dep = getDependencies(cliAnswers);
    await installDependencies(
      command,
      ['i', '-s', ...dep.dependencies.split(' ')],
      'Installing dependencies...',
      destination
    );
    await installDependencies(
      command,
      ['i', '-D', ...dep.devDependencies.split(' ')],
      'Installing dev dependencies...',
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
function copyBaseFiles(destination, cliAnswers) {
  const spinner = ora({
    text: 'Creating file structure...',
    spinner: 'dots',
  }).start();

  const baseFile = new Promise((resolve, reject) => {
    const prjFolder = cliAnswers.withMongo
      ? './express-typescript-with-mongo'
      : './express-typescript';
    const source = path.join(__dirname, prjFolder);
    ncp.limit = 16;
    ncp(source, destination, { clobber: false }, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      resolve();
      spinner.succeed();
    });
  });

  const commonFile = new Promise((resolve, reject) => {
    const commonFolder = './common_files/src';
    const source = path.join(__dirname, commonFolder);
    ncp.limit = 16;
    ncp(source, `${destination}/src`, { clobber: false }, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      resolve();
    });
  });

  const commonConfigFile = new Promise((resolve, reject) => {
    const commonFolder = './common_files/configFiles';
    const source = path.join(__dirname, commonFolder);
    ncp.limit = 16;
    ncp(source, `${destination}`, { clobber: false }, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      resolve();
    });
  });

  return Promise.all([baseFile, commonConfigFile, commonFile]);
}

function copyRouteFiles(destination, spinner, cliAnswers) {
  const optionLimiter = new Promise((resolve, reject) => {
    ncp.limit = 16;
    const filePath = cliAnswers.withLimiter
      ? `${urlOpt}/limiter-option/route/with-limiter`
      : `${urlOpt}/limiter-option/route/no-limiter`;
    const source = path.join(__dirname, filePath);
    ncp(source, `${destination}/src/routes`, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      resolve();
    });
  });

  let promises = [optionLimiter];
  if (cliAnswers.withAuthRoute) {
    const authFilePath = cliAnswers.withLimiter
      ? `${urlOpt}/auth/route/with-limiter`
      : `${urlOpt}/auth/route/no-limiter`;

    const optionLimiterMiddleware = new Promise((resolve, reject) => {
      ncp.limit = 16;
      const source = path.join(__dirname, authFilePath);
      ncp(source, `${destination}/src/routes`, function (err) {
        if (err) {
          spinner.fail();
          reject(err);
        }
        resolve();
      });
    });

    promises.push(optionLimiterMiddleware);
  }
  if (cliAnswers.withLimiter) {
    const optionLimiterMiddleware = new Promise((resolve, reject) => {
      ncp.limit = 16;
      const filePath = `${urlOpt}/limiter-option/middleware`;
      const source = path.join(__dirname, filePath);
      ncp(source, `${destination}/src/middleware`, function (err) {
        if (err) {
          spinner.fail();
          reject(err);
        }
        resolve();
      });
    });

    promises.push(optionLimiterMiddleware);
  }

  return Promise.all(promises);
}

function copyMongoFilesCliOptions(destination, cliAnswers) {
  const spinner = ora({
    text: 'Setting up mongoDb...',
    spinner: 'dots',
  }).start();
  return new Promise((resolve, reject) => {
    ncp.limit = 16;
    const filePath = cliAnswers.mongoWithRxjs
      ? `${urlOpt}/mongo/with-rxjs`
      : `${urlOpt}/mongo/no-rxjs`;
    const source = path.join(__dirname, filePath);
    ncp(source, `${destination}/src/controllers`, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      spinner.succeed();
      resolve();
    });
  });
}

function copyAuthFile(destination, spinner, cliAnswers) {
  const controllerFile = new Promise((resolve, reject) => {
    ncp.limit = 16;
    const filePath = cliAnswers.mongoWithRxjs
      ? `${urlOpt}/auth/controller/with-rxjs`
      : `${urlOpt}/auth/controller/no-rxjs`;
    const source = path.join(__dirname, filePath);
    ncp(source, `${destination}/src/controllers`, function (err) {
      if (err) {
        spinner.fail();
        reject(err);
      }
      resolve();
    });
  });

  const updateIndexRoute = new Promise((resolve, reject) => {
    const filePath = `${destination}/src/routes/index.ts`;
    fs.readFile(filePath, (err, data) => {
      if (err) {
        spinner.fail();
        reject();
      }
      let fileString = data.toString();
      const importAuth = `import authRoute from './auth.route';`;
      const useRoute = `\nrouter.use('/auth', authRoute);`;
      const stingArray = fileString.split('\n');
      stingArray.splice(2, 0, importAuth);
      stingArray.splice(6, 0, useRoute);
      fileString = stingArray.join('');
      fs.writeFileSync(filePath, fileString);
      resolve();
    });
  });

  return Promise.all([controllerFile, updateIndexRoute]);
}

/**
 * Set project name in package.json
 * @param destination
 */
function updatePackageJson(destination) {
  let file = editJsonFile(`${destination}/package.json`, {
    autosave: true,
  });
  file.set('name', path.basename(destination));
  file.set('description', 'My new project');
  file.set('scripts', {
    start: 'node ./dist/index.js',
    build: 'webpack --config ./webpack.config.js',
    dev: 'webpack --config ./webpack.dev.config.js',
  });
}

/**
 * Get dependencia and dev dependencies
 */
function getDependencies(cliAnswers) {
  let dependencies =
    'express helmet morgan winston dotenv cors auto-bind http-errors';
  let devDependencies =
    'ts-node typescript nodemon @types/node @types/express ' +
    '@types/node @types/express @types/cors @types/morgan @typescript-eslint/eslint-plugin ' +
    '@typescript-eslint/parser eslint eslint-config-airbnb-base eslint-plugin-import ' +
    'nodemon-webpack-plugin prettier ts-loader webpack webpack-cli webpack-node-externals ' +
    '@types/http-errors';

  if (cliAnswers.withLimiter) {
    dependencies += ' express-rate-limit';
    devDependencies += ' @types/express-rate-limit';
  }

  if (cliAnswers.withMongo) {
    dependencies += ' mongoose mongoose-unique-validator';
    devDependencies += ' @types/mongoose @types/mongoose-unique-validator';
  }

  if (cliAnswers.mongoWithRxjs) {
    dependencies += ' rxjs';
  }

  if (cliAnswers.withAuthRoute) {
    dependencies += ' bcryptjs jsonwebtoken';
    devDependencies += ' @types/bcryptjs @types/jsonwebtoken';
  }

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
function installDependencies(command, args, lodingText, destination) {
  return new Promise((resolve, reject) => {
    const spinner = ora({ text: lodingText, spinner: 'dots2' }).start();
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
 * Console log message when app generate process is done
 */
function done() {
  console.log(chalk.yellow('------------------------------------'));
  console.log('Begin by typing:');
  console.group();
  console.log(chalk.blue('cd'), process.argv[2]);
  console.log(chalk.blue('npm run dev'));
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
  generateApp,
  pathExist,
  done,
};
