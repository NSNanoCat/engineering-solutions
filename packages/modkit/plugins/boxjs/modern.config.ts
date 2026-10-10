import { defineConfig, moduleTools } from '@modern-js/module-tools';
import { dualBuildConfigs } from '@nsnanocat/modkit-config/modern.config.ts';

export default defineConfig({
  plugins: [moduleTools()],
  buildConfig: dualBuildConfigs,
});
