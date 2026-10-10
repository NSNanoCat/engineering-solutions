import fs from 'node:fs';
import path from 'node:path';
import { Surge2Egern } from '@nsnanocat/surge2egern';
import { logger } from '@nsnanocat/utils';
import type { ArgumentsBuilder } from '../core';
import type { Output } from './config';
import { handlebars } from './handlebars';
import { safeWriteFile } from './utils';

export const buildSurgeArguments = async (
  builder: ArgumentsBuilder,
  output: Output['surge'],
  configFileDir: string,
) => {
  const templatePath = path.resolve(configFileDir, output?.template ?? 'template/surge.handlebars');
  if (!output?.template && !fs.existsSync(templatePath)) {
    logger.warn('Surge template file does not exist, please check the configuration file');
    return;
  }
  const outputPath = output?.path ?? path.resolve('surge.sgmodule');

  try {
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const { argumentsText, argumentsDescription, scriptParams } = builder.buildSurgeArguments();
    const result = template({
      arguments: argumentsText,
      argumentsDesc: argumentsDescription.replace(/\n/g, '\\n'),
      scriptParams,
    });
    await safeWriteFile(outputPath, result);
    logger.success(`Successfully generated Surge module to ${outputPath}`);

    if (output?.transformEgern?.enable) {
      const surge2Egern = new Surge2Egern();
      try {
        const egernModule = await surge2Egern.transformModule(result);
        const egernOutputPath = output?.transformEgern?.path ?? path.resolve('egern.yaml');
        await safeWriteFile(egernOutputPath, egernModule);
        logger.success(`Successfully generated Egern module to ${egernOutputPath}`);
      } finally {
        await surge2Egern.destroy();
      }
    }
  } catch (error) {
    logger.error(`Failed to generate Surge module to ${outputPath}`, error);
    throw error;
  }
};
