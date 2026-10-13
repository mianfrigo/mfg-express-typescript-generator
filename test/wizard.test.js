import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { PRESETS } from '../lib/options.js';
import { runWizard, shouldRunWizard, toFlags } from '../lib/wizard.js';

const CANCEL = Symbol('cancel');

// scripted stand-in for @clack/prompts: answers are consumed in order
function fakePrompts(answers) {
  const calls = [];
  const take = (kind) => (opts) => {
    calls.push({ kind, opts });
    if (answers.length === 0) throw new Error(`unexpected ${kind}: ${opts.message}`);
    return Promise.resolve(answers.shift());
  };
  return {
    calls,
    select: take('select'),
    multiselect: take('multiselect'),
    confirm: take('confirm'),
    note: (message, title) => calls.push({ kind: 'note', opts: { message, title } }),
    isCancel: (v) => v === CANCEL,
  };
}

test('toFlags lists the database first, then features in a stable order', () => {
  assert.deepEqual(
    toFlags({ test: true, postgres: true, openapi: true, auth: true, zod: true }),
    ['--postgres', '--auth', '--zod', '--openapi', '--test']
  );
  assert.deepEqual(toFlags({}), []);
  assert.deepEqual(toFlags({ mongo: true, rxjs: true, docker: true }), ['--mongo', '--rxjs', '--docker']);
});

test('shouldRunWizard: only on a terminal, with nothing already decided', () => {
  const tty = { stdin: true, stdout: true };
  assert.equal(shouldRunWizard({}, tty), true);
  assert.equal(shouldRunWizard({ pm: 'pnpm', git: true }, tty), true, 'pm/git are not feature choices');
  assert.equal(shouldRunWizard({}, { stdin: false, stdout: true }), false);
  assert.equal(shouldRunWizard({}, { stdin: true, stdout: false }), false);
  assert.equal(shouldRunWizard({ yes: true }, tty), false);
  assert.equal(shouldRunWizard({ zod: true }, tty), false, 'a feature flag was given');
  assert.equal(shouldRunWizard({ mongo: true }, tty), false);
  assert.equal(shouldRunWizard({ ci: true }, tty), false);
});

test('wizard: choosing a preset returns its flags and shows the equivalent command', async () => {
  const p = fakePrompts(['api', true]);
  const flags = await runWizard({ prompts: p, projectName: 'shop' });
  assert.deepEqual(flags, { ...PRESETS.api });
  const note = p.calls.find((c) => c.kind === 'note');
  assert.match(note.opts.message, /shop --preset api$/);
  assert.equal(p.calls.filter((c) => c.kind === 'select').length, 1, 'no further questions');
});

test('wizard: minimal returns no feature flags', async () => {
  const flags = await runWizard({ prompts: fakePrompts(['minimal', true]), projectName: 'tiny' });
  assert.deepEqual(flags, {});
});

test('wizard custom without a database: auth and rxjs are disabled and say why; openapi only after zod', async () => {
  const p = fakePrompts(['custom', 'none', ['zod', 'test'], true, true]);
  const flags = await runWizard({ prompts: p, projectName: 'app' });
  assert.deepEqual(flags, { zod: true, test: true, openapi: true });

  const features = p.calls.find((c) => c.kind === 'multiselect').opts.options;
  for (const key of ['auth', 'rxjs']) {
    const o = features.find((x) => x.value === key);
    assert.equal(o.disabled, true, `${key} disabled`);
    assert.match(o.hint, /database/);
  }
  assert.ok(!features.find((x) => x.value === 'zod').disabled);
  assert.match(p.calls.find((c) => c.kind === 'note').opts.message, /--zod --openapi --test/);
});

test('wizard custom with a database enables auth and rxjs; declining openapi leaves it off', async () => {
  const p = fakePrompts(['custom', 'postgres', ['auth', 'zod', 'docker'], [], false, true]);
  const flags = await runWizard({ prompts: p, projectName: 'api' });
  assert.deepEqual(flags, { postgres: true, auth: true, zod: true, docker: true });

  const features = p.calls.find((c) => c.kind === 'multiselect').opts.options;
  assert.ok(!features.find((x) => x.value === 'auth').disabled);
  assert.ok(!features.find((x) => x.value === 'rxjs').disabled);
});

test('wizard custom: auth asks for roles and refresh tokens; no auth, no question', async () => {
  const p = fakePrompts(['custom', 'mongo', ['auth'], ['roles', 'refresh-tokens'], true]);
  const flags = await runWizard({ prompts: p, projectName: 'api' });
  assert.deepEqual(flags, { mongo: true, auth: true, roles: true, 'refresh-tokens': true });
  assert.match(p.calls.find((c) => c.kind === 'note').opts.message, /--mongo --auth --roles --refresh-tokens/);

  const q = fakePrompts(['custom', 'mongo', ['limiter'], true]); // nothing extra scripted
  assert.deepEqual(await runWizard({ prompts: q, projectName: 'api' }), { mongo: true, limiter: true });
  assert.equal(
    await runWizard({ prompts: fakePrompts(['custom', 'mongo', ['auth'], CANCEL]), projectName: 'x' }),
    null
  );
});

test('wizard custom without zod never asks about OpenAPI', async () => {
  const p = fakePrompts(['custom', 'mongo', ['limiter'], true]); // no openapi answer scripted
  const flags = await runWizard({ prompts: p, projectName: 'app' });
  assert.deepEqual(flags, { mongo: true, limiter: true });
  assert.equal(p.calls.filter((c) => c.kind === 'confirm').length, 1, 'only the final confirm');
});

test('wizard returns null on cancel at any step and when the user declines to create', async () => {
  assert.equal(await runWizard({ prompts: fakePrompts([CANCEL]), projectName: 'x' }), null);
  assert.equal(await runWizard({ prompts: fakePrompts(['custom', CANCEL]), projectName: 'x' }), null);
  assert.equal(
    await runWizard({ prompts: fakePrompts(['custom', 'none', CANCEL]), projectName: 'x' }),
    null
  );
  assert.equal(
    await runWizard({ prompts: fakePrompts(['custom', 'none', ['zod'], CANCEL]), projectName: 'x' }),
    null
  );
  assert.equal(await runWizard({ prompts: fakePrompts(['api', CANCEL]), projectName: 'x' }), null);
  assert.equal(await runWizard({ prompts: fakePrompts(['api', false]), projectName: 'x' }), null);
});

test('real @clack/prompts through injected streams: Enter picks the highlighted preset', async () => {
  const clack = await import('@clack/prompts');
  const input = new PassThrough();
  input.isTTY = true;
  input.setRawMode = () => input;
  const output = new PassThrough();
  output.isTTY = true;
  output.columns = 100;
  output.rows = 30;
  let shown = '';
  output.on('data', (d) => (shown += d));

  const run = runWizard({ prompts: clack, io: { input, output }, projectName: 'shop' });
  const press = (s) => new Promise((r) => setTimeout(() => { input.write(s); r(); }, 60));
  await press('\x1b[B'); // down: Minimal -> API starter
  await press('\r'); // select it
  await press('\r'); // confirm "Create shop?" (default yes)
  const flags = await run;
  assert.deepEqual(flags, { ...PRESETS.api });
  assert.match(shown, /How do you want to start\?/);
  assert.match(shown, /shop --preset api/);
});
