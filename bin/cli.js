const path = require('path');
const expressGenTs = require('../lib/express-generator-typescript');
const boxen = require('boxen');
const chalk = require('chalk');

(() => {
  console.log(
    boxen('Express typescript draf', {
      borderColor: 'yellow',
      borderStyle: 'classic',
      align: 'left',
    })
  );
  // Get the name of the new project
  let destination = getDest(process.argv[2]);
  expressGenTs(destination, withAuth).then(() => {
    done();
  });
})();

/**
 * Get the folder name of the new project
 *
 * @param destFolder
 */
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
