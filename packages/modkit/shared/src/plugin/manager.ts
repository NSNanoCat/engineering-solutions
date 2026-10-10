import { type AsyncManager, createAsyncManager, createAsyncWorkflow, createWorkflow } from '@modern-js/plugin';
import { logger } from '@nsnanocat/utils';

import type {
  CommandsParams,
  ConfigurePlatformReturn,
  ModifySourceParams,
  OnAfterBuildParams,
  OnAfterStartDevServerParams,
  OnBeforeStartDevServerParams,
  SourceConfig,
  TemplateParametersParams,
} from '../types';
import { runMaybeAsync } from '../utils';
import { setAppContext, useAppContext } from './context';

const hooks = {
  configurePlatform: createWorkflow<void, ConfigurePlatformReturn>(),
  modifySource: createAsyncWorkflow<ModifySourceParams, SourceConfig>(),
  templateParameters: createWorkflow<TemplateParametersParams, Record<string, any>>(),
  onBeforeStartDevServer: createAsyncWorkflow<OnBeforeStartDevServerParams, void>(),
  onAfterStartDevServer: createAsyncWorkflow<OnAfterStartDevServerParams, void>(),
  onBeforeBuild: createAsyncWorkflow<void, void>(),
  onAfterBuild: createAsyncWorkflow<OnAfterBuildParams, void>(),
  commands: createAsyncWorkflow<CommandsParams, void>(),
};

export const pluginAPI = {
  setAppContext,
  useAppContext,
  logger,
};

export type PluginAPI = typeof pluginAPI;

export const manager = createAsyncManager(hooks, pluginAPI);

export const { createPlugin, registerHook } = manager;

export type PluginType = ReturnType<AsyncManager<typeof hooks, PluginAPI>['createPlugin']>;

export const getPluginContext = async (plugin: ReturnType<typeof createPlugin>) => {
  const pluginCtx = await runMaybeAsync(plugin.setup, pluginAPI as any);
  if (!pluginCtx) {
    return {};
  }
  return pluginCtx;
};
