// Lists generated-app dependencies whose pinned version is behind the registry
// and prints a markdown table. Bumping is a manual edit in lib/generate.js
// followed by `FULL=1 npm test`.
// Held on purpose: typescript 5.x (typescript-eslint peer is <6.1) and
// vitest 4.x (vitest 5 needs Node >= 22; generated apps support Node 20).
import { pinned } from '../lib/generate.js';

const latestOf = async (name) => {
  const res = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2f')}/latest`
  );
  if (!res.ok) throw new Error(`${name}: registry answered ${res.status}`);
  return (await res.json()).version;
};

const entries = Object.entries(pinned());
const latest = await Promise.all(entries.map(([name]) => latestOf(name)));
const rows = entries
  .map(([name, version], i) => [name, version, latest[i]])
  .filter(([, version, l]) => version !== l)
  .map(([name, version, l]) => `| ${name} | ${version} | ${l} |`);

console.log(
  rows.length
    ? ['| package | pinned | latest |', '|---|---|---|', ...rows].join('\n')
    : 'All pinned versions are current.'
);
