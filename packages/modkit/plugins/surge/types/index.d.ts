import '@nsnanocat/modkit-shared';

declare module '@nsnanocat/modkit-shared' {
  interface ModkitPluginName {
    surge: 'surge';
  }

  interface PluginModuleContent {
    surgeGeneral?: Record<string, string>;
  }

  interface PluginModuleMITM {
    clientSourceAddress?: string[];
  }

  interface PluginArgumentType {
    surge?: import('@nsnanocat/modkit-shared').ArgumentType | 'exclude';
  }
}
