module.exports = [
  {
    type: 'confirm',
    name: 'withLimiter',
    message: 'Would you like to setup express-rate-limiter in your routes ?',
    default: false,
  },
  {
    type: 'confirm',
    name: 'withMongo',
    message: 'Would you like to setup mongoDb with mongoose ?',
    default: false,
  },
  {
    type: 'confirm',
    name: 'withAuthRoute',
    message: 'Would you like to create an authentication route ?',
    default: false,
    when: function (answers) {
      return answers.withMongo;
    },
  },
  {
    type: 'confirm',
    name: 'mongoWithRxjs',
    message: 'Would like to use rxjs instead of promises ?',
    default: false,
    when: function (answers) {
      return answers.withMongo;
    },
  },
];
