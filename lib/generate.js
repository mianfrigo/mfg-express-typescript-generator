import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, cp, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lib = path.dirname(fileURLToPath(import.meta.url));
// Template lines starting `//{{flag}} ` are kept (prefix stripped) when the flag
// is on; `//{{!flag}} ` lines are kept when it is off. See renderMarkers.
const MARKER = /^(?:\/\/|#)\{\{(!?)(\w+)\}\} /; // "//" in code, "#" in Dockerfile

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
  postgres: {
    dependencies: {
      '@prisma/client': '7.10.0',
      '@prisma/adapter-pg': '7.10.0',
      pg: '8.23.1',
    },
    devDependencies: { prisma: '7.10.0', '@types/pg': '8.23.1' },
  },
  zod: { dependencies: { zod: '4.6.5' } },
  openapi: {
    dependencies: { 'swagger-ui-express': '5.0.1' },
    devDependencies: { '@types/swagger-ui-express': '4.1.8' },
  },
  auth: {
    dependencies: { bcryptjs: '3.0.3', jsonwebtoken: '9.0.3' },
    devDependencies: { '@types/jsonwebtoken': '9.0.10' },
  },
};

// Every pinned generated-app dependency: { name: exactVersion }
export function pinned() {
  return Object.assign(
    {},
    BASE.dependencies,
    BASE.devDependencies,
    ...Object.values(EXTRA).flatMap((e) => [e.dependencies, e.devDependencies])
  );
}

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
  const enabled = {
    ...options,
    mongo: options.db === 'mongo',
    postgres: options.db === 'postgres',
  };
  if (options.db === 'postgres') {
    // the client is generated TypeScript (src/generated), so build needs it first
    Object.assign(pkg.scripts, {
      postinstall: 'prisma generate',
      'db:migrate': 'prisma migrate dev',
      'db:deploy': 'prisma migrate deploy',
    });
  }
  for (const key of Object.keys(EXTRA)) {
    if (!enabled[key]) continue;
    Object.assign(pkg.dependencies, EXTRA[key].dependencies);
    Object.assign(pkg.devDependencies, EXTRA[key].devDependencies);
  }
  return pkg;
}

export function renderMarkers(src, flags) {
  return src
    .split('\n')
    .flatMap((line) => {
      const m = MARKER.exec(line);
      if (!m) return [line];
      const [prefix, negate, name] = m;
      const keep = !!flags[name] !== (negate === '!');
      return keep ? [line.slice(prefix.length)] : [];
    })
    .join('\n');
}

// dest or any parent holds a .git entry (dir, or file for worktrees/submodules)
function insideGitRepo(dir) {
  for (let d = dir; ; d = path.dirname(d)) {
    if (existsSync(path.join(d, '.git'))) return true;
    if (path.dirname(d) === d) return false;
  }
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
    src(options.db ? `express-typescript-with-${options.db}` : 'express-typescript'),
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
  if (options.db) {
    await copy(src('template-options', options.db, style), out('src/controllers'));
  }
  if (options.auth) {
    await copy(src('template-options/auth/route', limiter), out('src/routes'));
    await copy(src('template-options/auth/middleware'), out('src/middleware'));
    await copy(
      src('template-options/auth/controller', options.db, style),
      out('src/controllers')
    );
    await appendFile(
      out('.env'),
      `\nSECRET_KEY=${randomBytes(32).toString('hex')}\n`
    );
  }

  if (options.docker) await copy(src('template-options/docker'), dest);
  if (options.test) await copy(src('template-options/vitest'), out('test'));
  if (options.zod) {
    await copy(src('template-options/zod/common'), out('src'));
    await copy(
      src('template-options/zod', options.db ? 'db' : 'base'),
      out('src/validation')
    );
    if (options.auth) {
      await copy(src('template-options/zod/auth'), out('src/validation'));
    }
  }

  if (options.openapi) {
    await copy(src('template-options/openapi/openapi.ts'), out('src/openapi.ts'));
  }

  const flags = {
    auth: !!options.auth,
    zod: !!options.zod,
    openapi: !!options.openapi,
    postgres: options.db === 'postgres',
  };
  const rendered = [
    'src/app.ts',
    'src/routes/index.ts',
    'src/routes/user.route.ts',
  ];
  if (options.openapi) rendered.push('src/openapi.ts');
  if (options.docker) rendered.push('Dockerfile');
  if (options.auth) rendered.push('src/routes/auth.route.ts');
  for (const rel of rendered) {
    const file = out(rel);
    await writeFile(file, renderMarkers(await readFile(file, 'utf8'), flags));
  }
  await writeFile(
    out('package.json'),
    JSON.stringify(buildPackageJson(path.basename(dest), options), null, 2) +
      '\n'
  );

  const initGit =
    options.git === true || (options.git === 'auto' && !insideGitRepo(dest));
  if (initGit) {
    await run('git', ['init', '-q'], dest, 'ignore').catch(() => {}); // git optional
  }
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
