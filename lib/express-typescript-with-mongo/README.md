![express-typescript](https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/express-typescript-draf.png?raw=true)

[Express](https://www.npmjs.com/package/express) with [TypeScript's](https://www.npmjs.com/package/typescript) application generator.

## What is it?

Node express generator similar to [express-generator-typescript](https://github.com/seanpmaxwell/express-generator-typescript) module. In this case we use
[Webpack](https://webpack.js.org/) to compile the typescript to Javascript, also implement [EsLint](https://eslint.org/) to follow
good practice and a clean code.

## Quick Start

The quickest way to get started is use npx and pass in the name of the project you want to create.
If you don't specify a project name, _express-ts_ will be set up for you as default name.

Create the app:

```bash
$ mfg-express-generator "project name (default is express-ts)"
```

Start your @mianfrigo/express-typescript-generator app
in development mode at `http://localhost:3000/`:

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
