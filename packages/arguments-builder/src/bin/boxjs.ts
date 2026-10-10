import path from 'node:path';
import { logger } from '@nsnanocat/utils';
import type { ArgumentsBuilder } from '../core';
import type { Output } from './config';
import { safeWriteFile } from './utils';

export const buildBoxJsSettings = async (builder: ArgumentsBuilder, output: Output['boxjsSettings']) => {
  const outputPath = output?.path ?? path.resolve('./boxjs.settings.json');
  try {
    await safeWriteFile(outputPath, JSON.stringify(builder.buildBoxJsSettings(output?.scope)));
    logger.success(`Successfully generated boxjs settings to ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to generate boxjs settings to ${outputPath}`, error);
    throw error;
  }
};
