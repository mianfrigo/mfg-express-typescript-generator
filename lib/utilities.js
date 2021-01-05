const chalk = require('chalk');
const pcg = require('../package.json');

function handleArgs(args) {
  if (args[0] === '-v' || args[0] === '--version') {
    console.log(chalk.yellow(`express-typescript-generator v${pcg.version}`));
    process.exit();
  }
  if (args[0] === '--mongo-db') {
    console.error(
      chalk.red(
        'project name most be follow by the params eg. "node-express --mongo-db"'
      )
    );
    process.exit();
  }
}

module.exports = {
  handleArgs,
};
