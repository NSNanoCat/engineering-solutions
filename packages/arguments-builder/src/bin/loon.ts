import fs from 'node:fs';
import path from 'node:path';
import { logger } from '@nsnanocat/utils';
import type { ArgumentsBuilder } from '../core';
import type { Output } from './config';
import { handlebars } from './handlebars';
import { safeWriteFile } from './utils';

export const buildLoonArguments = async (builder: ArgumentsBuilder, output: Output['loon'], configFileDir: string) => {
  const templatePath = path.resolve(configFileDir, output?.template ?? 'template/loon.handlebars');
  if (!output?.template && !fs.existsSync(templatePath)) {
    logger.warn('Loon template file does not exist, please check the configuration file');
    return;
  }

  const outputPath = output?.path ?? path.resolve('loon.plugin');
  try {
    const template = handlebars.compile(fs.readFileSync(templatePath, 'utf-8'));
    const { argumentsText, scriptParams } = builder.buildLoonArguments();
    await safeWriteFile(
      outputPath,
      template({
        arguments: argumentsText,
        scriptParams,
      }),
    );
    logger.success(`Successfully generated Loon plugin to ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to generate Loon plugin to ${outputPath}`, error);
    throw error;
  }
};
