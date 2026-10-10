import '@nsnanocat/modkit-shared';
import type { LoonArgumentType } from '../dist/index';

declare module '@nsnanocat/modkit-shared' {
  interface ModkitPluginName {
    loon: 'loon';
  }

  interface PluginModuleContent {
    loonGeneral?: Record<string, string>;
  }

  interface PluginArgumentType {
    loon?: LoonArgumentType;
  }
}
