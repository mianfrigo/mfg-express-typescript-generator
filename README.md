![express-typescript](https://github.com/mianfrigo/mfg-express-typescript-generator/blob/main/express-typescript-draf.png?raw=true)

[Express](https://www.npmjs.com/package/express) with [TypeScript's](https://www.npmjs.com/package/typescript) application generator.

## What is it?

Node express generator similar to [express-generator-typescript](https://github.com/seanpmaxwell/express-generator-typescript) module. In this case we use
[Webpack](https://www.npmjs.com/package/webpack) to compile the typescript to Javascript, also implement [EsLint](https://www.npmjs.com/package/eslint) to follow
good practice and a clean code.

## Project example

When you run _@mianfrigo/express-typescript-generator_, it sets up a very basic application with a single basic route.
This is to show how route work with node and express.

A small cli will guide you through a couple of option to setup you new project base on your needs. You can select and setup your routes using limiters or setup mongoDb with [mongoose](hhttps://www.npmjs.com/package/mongoose). The app is configured with production quality client-side security. The if you decide to use mongoDb it will generate a basic mongoose setup with `/user` as a first route, is implementing and full CRUD to show the use of mongoose. I highly encourage to use this option.

## Installation

```bash
$ npm install -g @mianfrigo/express-typescript-generator
```

## Quick Start

The quickest way to get started is use `$ mfg-express-generator` and pass in the name of the project you want to create.

If you don't specify a project name, _express-ts_ will be set up for you as default name.

Create the app:

```bash
$ mfg-express-generator "MY_PROJECT"
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

During development, _@mianfrigo/express-typescript-generator_ uses `webpack` compile the typescript code to jascript and `nodemon` to restart the server when changes are detected.

Happy coding

## License

[MIT](LICENSE)
