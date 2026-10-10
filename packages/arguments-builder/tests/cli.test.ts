import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Surge2Egern } from '@nsnanocat/surge2egern';
import { buildDtsArguments } from '../src/bin/dts';
import { buildSurgeArguments } from '../src/bin/surge';
import { ArgumentsBuilder } from '../src/core';

jest.mock('@nsnanocat/surge2egern');

const MockConverter = Surge2Egern as jest.MockedClass<typeof Surge2Egern>;
let directory: string;

beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'arguments-builder-'));
  jest.clearAllMocks();
});

afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

it('propagates type generation and file write failures', async () => {
  const builder = new ArgumentsBuilder({ args: [] });
  jest.spyOn(builder, 'buildDtsArguments').mockImplementationOnce(() => {
    throw new Error('type generation');
  });
  await expect(buildDtsArguments(builder, { path: path.join(directory, 'settings.d.ts') })).rejects.toThrow(
    'type generation',
  );
  const file = path.join(directory, 'file');
  fs.writeFileSync(file, 'not a directory');
  await expect(buildDtsArguments(builder, { path: path.join(file, 'settings.d.ts') })).rejects.toThrow();
});

it.each(['success', 'conversion failure', 'write failure'])('releases the converter after %s', async (outcome) => {
  const template = path.join(directory, 'surge.handlebars');
  fs.writeFileSync(template, '#!name=Test');
  const converter = {
    transformModule:
      outcome === 'conversion failure'
        ? jest.fn().mockRejectedValue(new Error('conversion failed'))
        : jest.fn().mockResolvedValue('name: Test'),
    destroy: jest.fn().mockResolvedValue(undefined),
  };
  MockConverter.mockImplementationOnce(() => converter as unknown as Surge2Egern);
  const outputPath = path.join(directory, 'egern.yaml');
  if (outcome === 'write failure') {
    fs.mkdirSync(outputPath);
  }
  const task = buildSurgeArguments(
    new ArgumentsBuilder({ args: [] }),
    {
      template,
      path: path.join(directory, 'surge.sgmodule'),
      transformEgern: { enable: true, path: outputPath },
    },
    directory,
  );
  switch (outcome) {
    case 'success':
      await task;
      expect(fs.readFileSync(outputPath, 'utf8')).toBe('name: Test');
      break;
    default:
      await expect(task).rejects.toThrow();
      break;
  }
  expect(converter.destroy).toHaveBeenCalledTimes(1);
});

it('returns nonzero from the built CLI for invalid types, write and Chrome failures', () => {
  const cli = path.resolve(__dirname, '../dist/lib/bin.js');
  const config = path.join(directory, 'config.cjs');
  const blocker = path.join(directory, 'blocker');
  fs.writeFileSync(blocker, 'not a directory');
  const cases = [
    { command: 'dts', config: { args: [{ key: 'Invalid', type: 'invalid' }] } },
    { command: 'dts', config: { args: [{ key: 'Invalid-Key', type: 'string' }] } },
    { command: 'dts', config: { args: [], output: { dts: { path: path.join(blocker, 'settings.d.ts') } } } },
    {
      command: 'surge',
      config: {
        args: [],
        output: {
          surge: {
            template: 'surge.handlebars',
            path: path.join(directory, 'surge.sgmodule'),
            transformEgern: { enable: true, path: path.join(directory, 'egern.yaml') },
          },
        },
      },
    },
  ];
  fs.writeFileSync(path.join(directory, 'surge.handlebars'), '#!name=Test');
  for (const item of cases) {
    fs.writeFileSync(config, `module.exports = ${JSON.stringify(item.config)}`);
    const result = spawnSync(process.execPath, [cli, item.command, '-c', config], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 15000,
      env: { ...process.env, PUPPETEER_EXECUTABLE_PATH: path.join(directory, 'missing-chrome') },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
  }
  fs.writeFileSync(config, 'module.exports = { args: [] }');
  const success = spawnSync(process.execPath, [cli, 'dts', '-c', config], { cwd: directory, encoding: 'utf8' });
  expect(success.status).toBe(0);
  expect(fs.existsSync(path.join(directory, 'src/settings.d.ts'))).toBe(true);
});

it('returns nonzero and releases the browser when CLI conversion fails', () => {
  const preload = path.join(directory, 'converter.cjs');
  const config = path.join(directory, 'config.cjs');
  const marker = path.join(directory, 'closed');
  fs.writeFileSync(
    preload,
    `
    const Module = require('node:module');
    const load = Module._load;
    Module._load = function(name, ...args) {
      if (name === '@nsnanocat/surge2egern') return { Surge2Egern: class {
        async transformModule() { throw new Error('conversion failed'); }
        async destroy() { require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'closed'); }
      } };
      return load.call(this, name, ...args);
    };
  `,
  );
  fs.writeFileSync(path.join(directory, 'surge.handlebars'), '#!name=Test');
  fs.writeFileSync(
    config,
    `module.exports = ${JSON.stringify({
      args: [],
      output: {
        surge: {
          template: 'surge.handlebars',
          path: path.join(directory, 'surge.sgmodule'),
          transformEgern: { enable: true },
        },
      },
    })}`,
  );
  const result = spawnSync(
    process.execPath,
    ['--require', preload, path.resolve(__dirname, '../dist/lib/bin.js'), 'surge', '-c', config],
    {
      cwd: directory,
      encoding: 'utf8',
      timeout: 15000,
    },
  );
  expect(result.status).toBe(1);
  expect(fs.existsSync(marker)).toBe(true);
});
