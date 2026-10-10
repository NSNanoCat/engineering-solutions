import { defineConfig, moduleTools } from '@modern-js/module-tools';
import { dualBuildConfigs } from '@nsnanocat/modkit-config/modern.config.ts';
import { dependencies } from './package.json';

export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: dualBuildConfigs.map((item) => ({
    ...item,
    autoExternal: {
      dependencies: false,
      peerDependencies: true,
    },
    externals: Object.keys(dependencies).filter((dep) => !['@modern-js/plugin', 'package-up'].includes(dep)),
  })),
});
