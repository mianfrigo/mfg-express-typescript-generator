#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { generateApp, previewApp } from '../lib/generate.js';
import {
  createAsk,
  loadConfig,
  parseCli,
  resolveOptions,
  validateName,
} from '../lib/options.js';

const pkg = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);

try {
  const argv = process.argv.slice(2);
  // .mfgrc.json defaults (current directory, then home); --no-config skips them
  const config = argv.includes('--no-config') ? {} : loadConfig();
  const { values, positionals } = parseCli(argv, { config });
  if (values.version) {
    console.log(`express-typescript-generator v${pkg.version}`);
    process.exit(0);
  }
  if (values.here && positionals.length) {
    throw new Error('--here cannot be combined with a project name');
  }
  const dest = values.here
    ? process.cwd()
    : path.resolve(positionals[0] ?? 'express-ts');
  validateName(path.basename(dest));
  if (values.here) {
    if (readdirSync(dest).some((f) => f !== '.git')) {
      throw new Error(`${dest} is not empty. --here needs an empty directory.`);
    }
  } else if (existsSync(dest)) {
    throw new Error(`${dest} already exists. Pick another name.`);
  }
  const ask = !values.yes && process.stdin.isTTY ? createAsk() : undefined;
  const options = await resolveOptions(values, ask);
  ask?.close();

  if (values['dry-run']) {
    const { files, pkg: preview } = await previewApp(dest, options);
    const features = ['db', 'auth', 'rxjs', 'limiter', 'zod', 'openapi', 'test', 'ci', 'docker']
      .filter((k) => options[k])
      .map((k) => (k === 'db' ? options.db : k));
    console.log(
      `\nDry run: nothing was written. A real run would create ${files.length} files in ${styleText('green', dest)}:\n`
    );
    for (const f of files) console.log(`  ${f}`);
    console.log(
      [
        '',
        `Options: ${features.length ? features.join(', ') : 'none (minimal)'}; package manager: ${options.pm}`,
        `package.json: ${Object.keys(preview.dependencies).length} dependencies, ${Object.keys(preview.devDependencies).length} devDependencies`,
        `scripts: ${Object.keys(preview.scripts).join(', ')}`,
        'Run the same command without --dry-run to create it.',
      ].join('\n')
    );
    process.exit(0);
  }

  console.log(`\nBootstrapping Express app in ${styleText('green', dest)}\n`);
  await generateApp(dest, options);

  const run = options.pm === 'npm' ? 'npm run' : options.pm;
  const cd = values.here
    ? ''
    : `
  cd ${path.relative(process.cwd(), dest)}`;
  console.log(`
Done. Next:${cd}
  ${run} dev     start dev server (tsx watch)
  ${run} build   compile to dist/
  ${options.pm} start   run compiled server`);
} catch (err) {
  console.error(styleText('red', err.message));
  process.exit(1);
}
