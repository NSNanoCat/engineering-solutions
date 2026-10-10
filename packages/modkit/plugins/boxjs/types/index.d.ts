import '@nsnanocat/modkit-shared';
import type { BoxJsType } from '../dist';

declare module '@nsnanocat/modkit-shared' {
  interface ModkitPluginName {
    boxjs: 'boxjs';
  }

  interface PluginArgumentType {
    boxJs?: BoxJsType | 'exclude';
  }
}
