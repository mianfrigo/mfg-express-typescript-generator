#!/usr/bin/env node

const { done, getDest, expressGenTs } = require('../lib/express-generator');

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
  expressGenTs(destination).then(() => {
    done();
  });
})();
