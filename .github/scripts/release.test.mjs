import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

const script = path.resolve('.github/scripts/release.mjs');

for (const registry of ['https://registry.npmjs.org/', 'https://npm.pkg.github.com/']) {
  for (const scenario of [
    'matching',
    'mismatch',
    'absent',
    'processing',
    'forbidden',
    'server-error',
    'missing-dependency',
  ]) {
    test(`${registry}: ${scenario}`, () => {
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-test-'));
      try {
        fs.mkdirSync(path.join(directory, 'release'));
        fs.mkdirSync(path.join(directory, 'bin'));
        const artifact = {
          name: '@nsnanocat/test',
          version: '1.0.0',
          tarball: 'test.tgz',
          integrity: 'sha512-same',
          dependencies: scenario === 'missing-dependency' ? { '@nsnanocat/utils': '^1.0.3' } : {},
        };
        fs.writeFileSync(path.join(directory, 'release/manifest.json'), JSON.stringify(artifact));
        fs.writeFileSync(
          path.join(directory, 'bin/npm'),
          `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync('commands.jsonl', JSON.stringify(args) + '\\n');
const scenario = process.env.SCENARIO;
if (args[0] === 'publish') { fs.writeFileSync('published', 'yes'); process.exit(0); }
if (scenario === 'forbidden' || scenario === 'server-error') {
  console.log(JSON.stringify({ error: { code: scenario === 'forbidden' ? 'E403' : 'E500' } })); process.exit(1);
}
if (scenario === 'processing' && fs.existsSync('published') && !fs.existsSync('indexed')) {
  fs.writeFileSync('indexed', 'yes');
  console.log(JSON.stringify({ error: { code: 'E404' } })); process.exit(1);
}
if (scenario === 'missing-dependency' || (['absent', 'processing'].includes(scenario) && !fs.existsSync('published'))) {
  console.log(JSON.stringify({ error: { code: 'E404' } })); process.exit(1);
}
console.log(JSON.stringify({ name: '@nsnanocat/test', version: '1.0.0', dist: {
  integrity: scenario === 'mismatch' ? 'sha512-other' : 'sha512-same'
} }));
`,
          { mode: 0o755 },
        );
        const result = spawnSync(process.execPath, [script, 'publish', registry], {
          cwd: directory,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${path.join(directory, 'bin')}:${process.env.PATH}`,
            SCENARIO: scenario,
            NODE_AUTH_TOKEN: '',
          },
        });
        const expectedSuccess = ['matching', 'absent', 'processing'].includes(scenario);
        assert.equal(result.status, expectedSuccess ? 0 : 1, result.stderr);
        const commands = fs
          .readFileSync(path.join(directory, 'commands.jsonl'), 'utf8')
          .trim()
          .split('\n')
          .map(JSON.parse);
        const publications = commands.filter((command) => command[0] === 'publish');
        assert.equal(publications.length, ['absent', 'processing'].includes(scenario) ? 1 : 0);
        if (publications.length) {
          assert.equal(publications[0][1], path.join(fs.realpathSync(directory), 'release/test.tgz'));
          assert.ok(publications[0].includes(`--registry=${registry}`));
        }
      } finally {
        fs.rmSync(directory, { recursive: true, force: true });
      }
    });
  }
}

test('a tag not matching a manifest cannot be packed', () => {
  const result = spawnSync(process.execPath, [script, 'pack', '@nsnanocat/utils@9.9.9'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Tag does not match/);
});
