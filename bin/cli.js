#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { generateApp } from '../lib/generate.js';
import { createAsk, parseCli, resolveOptions } from '../lib/options.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

try {
  const { values, positionals } = parseCli(process.argv.slice(2));
  if (values.version) {
    console.log(`express-typescript-generator v${pkg.version}`);
    process.exit(0);
  }
  const dest = path.resolve(positionals[0] ?? 'express-ts');
  if (existsSync(dest)) {
    throw new Error(`${dest} already exists. Pick another name.`);
  }
  const ask = !values.yes && process.stdin.isTTY ? createAsk() : undefined;
  const options = await resolveOptions(values, ask);
  ask?.close();

  console.log(`\nBootstrapping Express app in ${styleText('green', dest)}\n`);
  await generateApp(dest, options);

  const run = options.pm === 'npm' ? 'npm run' : options.pm;
  console.log(`
Done. Next:
  cd ${path.basename(dest)}
  ${run} dev     start dev server (tsx watch)
  ${run} build   compile to dist/
  ${options.pm} start   run compiled server`);
} catch (err) {
  console.error(styleText('red', err.message));
  process.exit(1);
}
