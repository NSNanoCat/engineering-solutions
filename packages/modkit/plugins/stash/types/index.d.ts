import '@nsnanocat/modkit-shared';

declare module '@nsnanocat/modkit-shared' {
  interface ModkitPluginName {
    stash: 'stash';
  }
  interface PluginArgumentType {
    stash?: 'exclude';
  }
}
