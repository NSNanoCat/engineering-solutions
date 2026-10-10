import { loadConfigFile, lodash, logger } from '@nsnanocat/utils';
import type { ModkitConfig } from '../types';
import { handleArgumentsDefaultValue } from '../utils';

export function defineConfig(config: ModkitConfig | (() => ModkitConfig)): ModkitConfig {
  if (typeof config === 'function') {
    return config();
  }
  return config;
}

const getDefaultConfig = (): ModkitConfig => {
  const root = process.env.MODKIT_ROOT || process.cwd();

  let packageJson: any = {};
  try {
    packageJson = require(`${root}/package.json`);
  } catch (e) {
    // ignore
  }

  return {
    source: {
      moduleName: `${packageJson.name}`.split('/').pop(),
      metadata: {
        name: packageJson.displayName || packageJson.name,
        description: packageJson.description,
        version: packageJson.version,
      },
    },
    output: {
      distPath: {
        root: 'dist',
        js: 'scripts',
        assets: 'static',
      },
      handleArgumentsDefaultValue,
    },
    dev: {
      port: 3000,
    },
  };
};

export const loadConfig = async (
  configPath?: string,
): Promise<{
  config: ModkitConfig;
  configFilePath: string;
}> => {
  const resp = await loadConfigFile<ModkitConfig>({
    configPath,
    baseConfigName: 'modkit.config',
    cwd: process.env.MODKIT_ROOT || process.cwd(),
  });
  if (!resp) {
    logger.error('未找到配置文件');
    process.exit(1);
  }
  const { config, configFilePath } = resp;
  const defaultConfig = getDefaultConfig();
  return {
    config: lodash.merge(defaultConfig, config),
    configFilePath,
  };
};
