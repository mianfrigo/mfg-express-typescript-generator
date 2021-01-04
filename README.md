<img alt='overnightjs' src='./express-typescript-draf.png' border='0'>

[Express](https://www.npmjs.com/package/express) with [TypeScript's](https://www.npmjs.com/package/typescript) application generator.

## What is it?

Node express generator similar to [express-generator-typescript](https://github.com/seanpmaxwell/express-generator-typescript) module. In this case we user
[Webpack](https://webpack.js.org/) to compile the typescript to Javascript, also implement [EsLint](https://eslint.org/) to follow
good practice and a clean code.

## Project example

When you run _express-typescript-draf_, it sets up a very basic application with a single basic route.
This is to show how route work with node and express.

If you want a fully-secure application, you can pass the `--with-auth` option and you will have an
application which requires you to logon before calling APIs on user objects. The app is
configured with production quality client-side security and uses signed-cookies and jsonwebtokens
to store user-session data. If you're new to web-development and still learning about securing websites,
I highly encourage to use this option.

## Installation

```sh
$ npm install -g express-typescript-draf
```

## Quick Start

The quickest way to get started is use npx and pass in the name of the project you want to create.
If you don't specify a project name, _express-ts_ will be set up for you as default name.

Create the app:

```bash
$ npx express-typescript-draf "project name (default is express-ts)"
```

Start your express-generator-typescript app in development mode at `http://localhost:3000/`:

```bash
$ cd "project name" && npm run dev:server
```

## Available commands for the server.

- Run the production build: `npm start`.
- Build the project for production: `npm run build`.
- Run the server in development mode: `npm run dev:server`.

## Debugging

During development, _express-generator-typescript_ uses `webpack` compile the typescript code to jascript
and `nodemon` to restart the server when changes are detected.

Happy coding

## License

[MIT](LICENSE)
