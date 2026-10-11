import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { appendFile, cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lib = path.dirname(fileURLToPath(import.meta.url));
const AUTH_MARK = '//{{auth}} ';
const NOAUTH_MARK = '//{{noauth}} ';

// Exact versions. Bump here, then run `FULL=1 node --test`.
const BASE = {
  dependencies: {
    express: '5.3.0',
    helmet: '8.3.0',
    morgan: '1.12.1',
    winston: '3.19.0',
    dotenv: '18.0.7',
    cors: '2.8.6',
    'http-errors': '2.0.1',
  },
  devDependencies: {
    typescript: '5.9.3',
    tsx: '4.23.15',
    eslint: '10.12.0',
    '@eslint/js': '10.0.1',
    'typescript-eslint': '8.71.1',
    'eslint-config-prettier': '10.1.8',
    prettier: '3.9.10',
    '@types/node': '26.6.5',
    '@types/express': '5.0.6',
    '@types/cors': '2.8.19',
    '@types/morgan': '1.9.10',
    '@types/http-errors': '2.0.5',
  },
};

const EXTRA = {
  limiter: { dependencies: { 'express-rate-limit': '8.7.1' } },
  mongo: { dependencies: { mongoose: '9.11.1' } },
  rxjs: { dependencies: { rxjs: '7.8.2' } },
  test: {
    devDependencies: {
      // 4.x crashes npm 10's resolver ("reading 'edgesOut'"); 3.x works on npm 8-11
      vitest: '3.2.7',
      supertest: '7.3.1',
      '@types/supertest': '7.2.1',
    },
  },
  auth: {
    dependencies: { bcryptjs: '3.0.3', jsonwebtoken: '9.0.3' },
    devDependencies: { '@types/jsonwebtoken': '9.0.10' },
  },
};

function buildPackageJson(name, options) {
  const pkg = {
    name,
    version: '0.1.0',
    private: true,
    description: 'My new project',
    scripts: {
      start: 'node dist/index.js',
      build: 'tsc',
      dev: 'tsx watch src/index.ts',
      lint: 'eslint .',
    },
    engines: { node: '>=20.19' },
    dependencies: { ...BASE.dependencies },
    devDependencies: { ...BASE.devDependencies },
  };
  if (options.test) pkg.scripts.test = 'vitest run';
  for (const key of Object.keys(EXTRA)) {
    if (!options[key]) continue;
    Object.assign(pkg.dependencies, EXTRA[key].dependencies);
    Object.assign(pkg.devDependencies, EXTRA[key].devDependencies);
  }
  return pkg;
}

export function renderRoutesIndex(src, auth) {
  return src
    .split('\n')
    .flatMap((line) => {
      if (line.startsWith(AUTH_MARK)) {
        return auth ? [line.slice(AUTH_MARK.length)] : [];
      }
      if (line.startsWith(NOAUTH_MARK)) {
        return auth ? [] : [line.slice(NOAUTH_MARK.length)];
      }
      return [line];
    })
    .join('\n');
}

function run(cmd, args, cwd, stdio = 'inherit') {
  return new Promise((resolve, reject) => {
    // Windows: Node refuses to spawn npm.cmd/pnpm.cmd without a shell, and
    // passing args alongside shell:true is deprecated (DEP0190), so send one
    // command string. Inputs are fixed words and the --pm enum, nothing user-typed.
    const child =
      process.platform === 'win32'
        ? spawn([cmd, ...args].join(' '), { cwd, stdio, shell: true })
        : spawn(cmd, args, { cwd, stdio });
    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code || signal) {
        reject(new Error(`${cmd} ${args.join(' ')} failed (${code ?? signal})`));
      } else {
        resolve();
      }
    });
  });
}

export async function generateApp(dest, options) {
  const src = (...p) => path.join(lib, ...p);
  const out = (...p) => path.join(dest, ...p);
  const copy = (from, to) => cp(from, to, { recursive: true });
  const limiter = options.limiter ? 'with-limiter' : 'no-limiter';
  const style = options.rxjs ? 'with-rxjs' : 'no-rxjs';

  await copy(
    src(options.mongo ? 'express-typescript-with-mongo' : 'express-typescript'),
    dest
  );
  await copy(src('common_files/src'), out('src'));
  await copy(src('common_files/configFiles'), dest);
  await rename(out('gitignore'), out('.gitignore'));
  await copy(
    src('template-options/limiter-option/route', limiter),
    out('src/routes')
  );
  if (options.limiter) {
    await copy(
      src('template-options/limiter-option/middleware'),
      out('src/middleware')
    );
  }
  if (options.mongo) {
    await copy(src('template-options/mongo', style), out('src/controllers'));
  }
  if (options.auth) {
    await copy(src('template-options/auth/route', limiter), out('src/routes'));
    await copy(src('template-options/auth/middleware'), out('src/middleware'));
    await copy(
      src('template-options/auth/controller', style),
      out('src/controllers')
    );
    await appendFile(
      out('.env'),
      `\nSECRET_KEY=${randomBytes(32).toString('hex')}\n`
    );
  }

  if (options.docker) await copy(src('template-options/docker'), dest);
  if (options.test) await copy(src('template-options/vitest'), out('test'));

  const routesIndex = out('src/routes/index.ts');
  await writeFile(
    routesIndex,
    renderRoutesIndex(await readFile(routesIndex, 'utf8'), options.auth)
  );
  await writeFile(
    out('package.json'),
    JSON.stringify(buildPackageJson(path.basename(dest), options), null, 2) +
      '\n'
  );

  await run('git', ['init', '-q'], dest, 'ignore').catch(() => {}); // git optional
  if (options.install) {
    try {
      await run(options.pm, ['install'], dest);
    } catch (err) {
      throw new Error(
        `Files were generated in ${dest}, but "${options.pm} install" failed. ` +
          `cd into it and run the install manually.\n${err.message}`
      );
    }
  }
}
