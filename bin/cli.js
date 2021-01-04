const {
  getDest,
  done,
  expressGenTs,
} = require('../lib/express-generator-typescript');
const boxen = require('boxen');

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
