<img alt='overnightjs' src='https://raw.githubusercontent.com/mianfrigo/express-typescript-draf/main/express-typescript-draf.png?token=AEAZYL6RD5DI6J3HXRRRICS76ORS6' border='0'>

[Express](https://www.npmjs.com/package/express) with [TypeScript's](https://www.npmjs.com/package/typescript) application generator.

## What is it?

Node express generator similar to [express-generator-typescript](https://github.com/seanpmaxwell/express-generator-typescript) module. In this case we user
[Webpack](https://webpack.js.org/) to compile the typescript to Javascript, also implement [EsLint](https://eslint.org/) to follow
good practice and a clean code.

## Project example

When you run _express-typescript-draf_, it sets up a very basic application with a single basic route.
This is to show how route work with node and express.

If you want an application ready to use with and db, you can pass the `--mongo-db` option and you will have an
application which is ready to use mongoDb. The app is configured with production quality client-side security.
I highly encourage to use this option.

## Installation

```sh
$ npm install -g @mianfrigo/express-typescript-generator
```

## Quick Start

The quickest way to get started is use npx and pass in the name of the project you want to create.
If you don't specify a project name, _express-ts_ will be set up for you as default name.

Create the app:

```bash
$ express-generator "project name (default is express-ts)"
```

Start your express-typescript-draf app in development mode at `http://localhost:3000/`:

```bash
$ cd "project name" && npm run dev
```

## Available commands for the server.

- Run the production build: `npm start`.
- Build the project for production: `npm run build`.
- Run the server in development mode: `npm run dev`.

## Debugging

During development, _express-generator-typescript_ uses `webpack` compile the typescript code to jascript
and `nodemon` to restart the server when changes are detected.

Happy coding

## License

[MIT](LICENSE)
