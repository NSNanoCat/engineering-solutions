import path from 'node:path';
import { loadConfigFile } from '@nsnanocat/utils';
import { z } from 'zod';
import { argumentsBuilderOptionsSchema } from '../core/types';

const outputSchema = z.object({
  surge: z
    .object({
      template: z.string().optional(),
      path: z.string().optional(),
      transformEgern: z
        .object({
          enable: z.boolean().optional().default(true),
          path: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
  loon: z
    .object({
      template: z.string().optional(),
      path: z.string().optional(),
    })
    .optional(),
  boxjsSettings: z
    .object({
      scope: z.string().optional(),
      path: z.string().default('boxjs.settings.json').optional(),
    })
    .optional(),
  dts: z
    .object({
      path: z.string().default('./src/settings.d.ts').optional(),
      isExported: z.boolean().optional(),
    })
    .optional(),
  customItems: z
    .array(
      z.object({
        template: z.string(),
        path: z.string(),
      }),
    )
    .optional(),
});

export type Output = z.infer<typeof outputSchema>;

const argumentsBuilderConfigSchema = argumentsBuilderOptionsSchema.extend({
  output: outputSchema.optional(),
});

export type ArgumentsBuilderConfig = z.infer<typeof argumentsBuilderConfigSchema>;

export const loadConfig = async ({
  cwd = process.cwd(),
  path: configPath,
}: {
  cwd?: string;
  path?: string;
} = {}) => {
  const { config, configFilePath } =
    (await loadConfigFile<ArgumentsBuilderConfig>({
      configPath,
      baseConfigName: 'arguments-builder.config',
      cwd,
    })) ?? {};

  const result = argumentsBuilderConfigSchema.safeParse(config);

  if (!result.success) {
    throw result.error;
  }

  return {
    config: result.data,
    configFileDir: path.dirname(configFilePath ?? ''),
  };
};
