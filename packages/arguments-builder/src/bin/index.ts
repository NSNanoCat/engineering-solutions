#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { commander, logger } from '@nsnanocat/utils';
import { buildBoxJsSettings } from './boxjs';
import { getBuilder } from './builder';
import { ArgumentsBuilderConfig } from './config';
import { buildDtsArguments } from './dts';
import { handlebars } from './handlebars';
import { buildLoonArguments } from './loon';
import { buildSurgeArguments } from './surge';
import { safeWriteFile } from './utils';

export { ArgumentsBuilderConfig };

const { program } = commander;

const packageJsonPath = path.resolve(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (!process.env.BUILD_VERSION) {
    process.env.BUILD_VERSION = packageJson.version;
  }
  process.env.PACKAGE_JSON_DATA = JSON.stringify(packageJson);
}

program.version(process.env.VERSION || '0.0.0');

const dtsCommand = program.command('dts').description('Generate d.ts file');
const surgeCommand = program.command('surge').description('Generate Surge configuration file');
const loonCommand = program.command('loon').description('Generate Loon configuration file');
const boxjsCommand = program.command('boxjs').description('Generate BoxJS settings snippet');
const buildCommand = program.command('build').description('Generate all configuration files');

[buildCommand, surgeCommand, loonCommand, boxjsCommand, dtsCommand].forEach((command) => {
  command.option('-c --config <config>', 'specify the configuration file, can be a relative or absolute path');
});

dtsCommand.action(async (option) => {
  const { builder, output } = await getBuilder({ path: option.config });
  await buildDtsArguments(builder, output?.dts);
});

surgeCommand.action(async (option) => {
  const { builder, output, configFileDir } = await getBuilder({ path: option.config });
  await buildSurgeArguments(builder, output?.surge, configFileDir);
});

loonCommand.action(async (option) => {
  const { builder, output, configFileDir } = await getBuilder({ path: option.config });
  await buildLoonArguments(builder, output?.loon, configFileDir);
});

boxjsCommand.action(async (option) => {
  const { builder, output } = await getBuilder({ path: option.config });
  await buildBoxJsSettings(builder, output?.boxjsSettings);
});

buildCommand.action(async (option) => {
  const { builder, output, configFileDir } = await getBuilder({ path: option.config });
  const results = await Promise.allSettled(
    [
      buildSurgeArguments(builder, output?.surge, configFileDir),
      buildLoonArguments(builder, output?.loon, configFileDir),
      buildBoxJsSettings(builder, output?.boxjsSettings),
    ].concat(
      output?.customItems?.map(async (item) => {
        try {
          const template = handlebars.compile(fs.readFileSync(item.template, 'utf-8'));
          await safeWriteFile(item.path, template({}));
          logger.success(`Successfully generated custom item to ${item.path}`);
        } catch (error) {
          logger.error(`Failed to generate custom item to ${item.path}`, error);
          throw error;
        }
      }) ?? [],
    ),
  );
  const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason);
  if (errors.length) {
    throw new AggregateError(errors, 'Configuration generation failed');
  }
});

program.parseAsync(process.argv).catch((error) => {
  logger.error(error);
  process.exitCode = 1;
});
