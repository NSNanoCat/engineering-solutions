import path from 'node:path';
import { logger } from '@nsnanocat/utils';
import type { ArgumentsBuilder } from '../core';
import type { Output } from './config';
import { safeWriteFile } from './utils';

export const buildDtsArguments = async (builder: ArgumentsBuilder, output: Output['dts']) => {
  const outputPath = output?.path ?? path.resolve('./src/settings.d.ts');
  try {
    await safeWriteFile(
      outputPath,
      builder.buildDtsArguments({
        isExported: output?.isExported ?? !outputPath.endsWith('.d.ts'),
      }),
    );
    logger.success(`Successfully generated typescript to ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to generate typescript to ${outputPath}`, error);
    throw error;
  }
};
