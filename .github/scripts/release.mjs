import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

const npmRegistry = 'https://registry.npmjs.org/';
const output = path.resolve('release');
const run = (command, args, options = {}) => execFileSync(command, args, { encoding: 'utf8', ...options });
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const registryArgs = (registry) => [`--registry=${registry}`, `--@nsnanocat:registry=${registry}`];

function metadata(spec, registry) {
  const result = spawnSync('npm', ['view', spec, '--json', ...registryArgs(registry)], { encoding: 'utf8' });
  if (result.status === 0) {
    return JSON.parse(result.stdout);
  }
  const error = JSON.parse(result.stdout).error;
  if (error.code === 'E404') {
    return undefined;
  }
  throw new Error(`${spec}: ${result.stderr}`);
}

function checkIntegrity(published, artifact) {
  assert.equal(published.name, artifact.name);
  assert.equal(published.version, artifact.version);
  assert.equal(published.dist.integrity, artifact.integrity, 'Published tarball differs from the build artifact');
}

async function publishedMetadata(spec, registry) {
  for (let attempt = 0; attempt < 18; attempt++) {
    const published = metadata(spec, registry);
    if (published) {
      return published;
    }
    await setTimeout(10_000);
  }
  throw new Error(`${spec} is not available after publication; rerun once registry processing completes`);
}

function pack(tag) {
  assert.match(tag, /^@nsnanocat\/[a-z0-9-]+@\d+\.\d+\.\d+$/);
  const packages = run('git', ['ls-files', 'packages/**/package.json'])
    .trim()
    .split('\n')
    .map((file) => ({ file, manifest: json(file) }));
  const selected = packages.find(({ manifest }) => `${manifest.name}@${manifest.version}` === tag);
  assert.ok(selected, 'Tag does not match a workspace package version');
  assert.notEqual(selected.manifest.private, true, 'Private workspaces cannot be released');
  fs.mkdirSync(output, { recursive: true });
  run('pnpm', ['pack', '--pack-destination', output], { cwd: path.dirname(selected.file), stdio: 'inherit' });
  const tarball = `${selected.manifest.name.slice(1).replace('/', '-')}-${selected.manifest.version}.tgz`;
  const content = fs.readFileSync(path.join(output, tarball));
  const packed = JSON.parse(run('tar', ['-xOf', path.join(output, tarball), 'package/package.json']));
  const files = run('tar', ['-tf', path.join(output, tarball)])
    .trim()
    .split('\n');
  for (const section of ['dependencies', 'peerDependencies', 'optionalDependencies']) {
    for (const [name, range] of Object.entries(packed[section] ?? {})) {
      assert.ok(!name.startsWith('@iringo/'), 'Old-scope runtime dependency');
      assert.ok(!range.startsWith('workspace:'), 'Unresolved workspace dependency');
      assert.ok(
        !packages.some(({ manifest }) => manifest.name === name && manifest.private),
        'Private runtime dependency',
      );
    }
  }
  const entry = packed.exports?.['.'];
  for (const target of [
    packed.main,
    packed.module,
    packed.types,
    entry?.types,
    entry?.import,
    entry?.require,
    ...Object.values(typeof packed.bin === 'object' ? packed.bin : {}),
  ].filter(Boolean)) {
    assert.ok(files.includes(`package/${target.replace(/^\.\//, '')}`), `Missing entry: ${target}`);
  }
  const integrity = `sha512-${createHash('sha512').update(content).digest('base64')}`;
  const artifact = {
    name: packed.name,
    version: packed.version,
    tarball,
    integrity,
    dependencies: packed.dependencies ?? {},
  };
  fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(artifact, null, 2) + '\n');
  const changelog = fs.readFileSync(path.join(path.dirname(selected.file), 'CHANGELOG.md'), 'utf8');
  const heading = `## ${packed.version}\n`;
  assert.ok(changelog.includes(heading), 'Missing package CHANGELOG entry');
  const body = changelog.split(heading)[1].split(/\n## /)[0].trim();
  fs.writeFileSync(path.join(output, 'notes.md'), body + '\n');
  console.log(`${tag}: ${integrity}`);
}

async function publish(registry) {
  const artifact = json(path.join(output, 'manifest.json'));
  if (registry === npmRegistry && process.env.NODE_AUTH_TOKEN) {
    const account = run('npm', ['whoami', `--registry=${registry}`]).trim();
    const members = JSON.parse(run('npm', ['org', 'ls', 'nsnanocat', '--json', `--registry=${registry}`]));
    assert.ok(members[account], 'npm token is not a member of NSNanoCat');
  }
  for (const [name, range] of Object.entries(artifact.dependencies).filter(([name]) =>
    name.startsWith('@nsnanocat/'),
  )) {
    const dependency = metadata(`${name}@${range}`, registry);
    assert.ok(dependency, `Publish and verify ${name}@${range} first`);
  }
  const existing = metadata(`${artifact.name}@${artifact.version}`, registry);
  if (existing) {
    checkIntegrity(existing, artifact);
    console.log(`Already published with matching content: ${artifact.name}@${artifact.version}`);
    return;
  }
  run('npm', ['publish', path.join(output, artifact.tarball), '--access=public', ...registryArgs(registry)], {
    stdio: 'inherit',
  });
  checkIntegrity(await publishedMetadata(`${artifact.name}@${artifact.version}`, registry), artifact);
}

async function verify(registry) {
  const artifact = json(path.join(output, 'manifest.json'));
  checkIntegrity(await publishedMetadata(`${artifact.name}@${artifact.version}`, registry), artifact);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'public-package-'));
  try {
    fs.writeFileSync(path.join(directory, 'package.json'), '{"private":true,"type":"module"}');
    run(
      'npm',
      [
        'install',
        `${artifact.name}@${artifact.version}`,
        'typescript@5.6.3',
        '@types/node@20',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        `--registry=${npmRegistry}`,
        `--@nsnanocat:registry=${registry}`,
      ],
      {
        cwd: directory,
        stdio: 'inherit',
        env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true' },
      },
    );
    const packageDirectory = path.join(directory, 'node_modules', artifact.name);
    const installed = json(path.join(packageDirectory, 'package.json'));
    assert.equal(installed.version, artifact.version);
    const require = createRequire(path.join(directory, 'package.json'));
    require(artifact.name);
    await import(pathToFileURL(path.join(packageDirectory, installed.module ?? installed.exports['.'].import)));
    fs.writeFileSync(path.join(directory, 'check.mts'), `import * as api from '${artifact.name}';\nvoid api;\n`);
    run(
      path.join(directory, 'node_modules/.bin/tsc'),
      ['check.mts', '--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext'],
      { cwd: directory, stdio: 'inherit' },
    );
    if (installed.bin?.modkit) {
      fs.writeFileSync(path.join(directory, 'modkit.config.cjs'), 'module.exports = {};');
    }
    for (const bin of Object.values(installed.bin ?? {})) {
      run(process.execPath, [path.join(packageDirectory, bin), '--version'], { cwd: directory, stdio: 'inherit' });
    }
    const lock = json(path.join(directory, 'package-lock.json'));
    for (const [name, item] of Object.entries(lock.packages)) {
      if (name.includes('node_modules/@nsnanocat/')) {
        assert.ok(item.resolved.startsWith(registry), `${name} came from the wrong registry`);
      }
    }
    console.log(`Installed and verified ${artifact.name}@${artifact.version} from ${registry}`);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

switch (process.argv[2]) {
  case 'pack':
    pack(process.argv[3] ?? process.env.GITHUB_REF_NAME);
    break;
  case 'publish':
    await publish(process.argv[3]);
    break;
  case 'verify':
    await verify(process.argv[3]);
    break;
  default:
    throw new Error('Expected pack, publish or verify');
}
