import type { Server } from 'node:http';
import type { AsyncWorker, Worker } from '@modern-js/plugin';
import type { commander } from '@nsnanocat/utils';
import type { RsbuildInstance } from '@rsbuild/core';
import type { Express } from 'express';
import type { PluginAPI } from '../plugin/manager';
import type { HandleArgumentsDefaultValue } from './output';
import type { SourceConfig } from './source';

type RsbuildDevServer = Awaited<ReturnType<RsbuildInstance['createDevServer']>>;

export interface ModifySourceParams {
  source: SourceConfig;
}

export interface TemplateParametersParams {
  source: SourceConfig;
  getFilePath: (fileName: string) => string;
  getScriptPath: (scriptKey: string) => string;
  handleArgumentsDefaultValue: HandleArgumentsDefaultValue;
}

export interface ConfigurePlatformReturn {
  /**
   * 拓展名
   */
  extension: `.${string}`;
  /**
   * 渲染模板
   */
  template: string;
}

export interface OnBeforeStartDevServerParams {
  app: Express;
  isFirstCompile: boolean;
}

export interface OnAfterStartDevServerParams {
  app: Express;
  isFirstCompile: boolean;
  httpServer: Server;
  rsbuildServer: RsbuildDevServer;
}

export interface OnAfterBuildParams {
  distPath?: string;
}

export interface CommandsParams {
  program: commander.Command;
}

export interface PluginHooks {
  /**
   * 配置平台信息
   */
  configurePlatform?: Worker<void, ConfigurePlatformReturn>;
  /**
   * 针对当前平台修改配置
   */
  modifySource?: AsyncWorker<ModifySourceParams, SourceConfig>;
  /**
   * 注入模板参数
   */
  templateParameters?: Worker<TemplateParametersParams, Record<string, any>>;
  /**
   * 启动开发服务器前
   */
  onBeforeStartDevServer?: AsyncWorker<OnBeforeStartDevServerParams, void>;
  /**
   * 启动开发服务器后
   */
  onAfterStartDevServer?: AsyncWorker<OnAfterStartDevServerParams, void>;
  /**
   * 构建前
   */
  onBeforeBuild?: AsyncWorker<void, void>;
  /**
   * 构建后
   */
  onAfterBuild?: AsyncWorker<OnAfterBuildParams, void>;
  /**
   * 为 commander 添加新的 CLI 命令
   */
  commands?: AsyncWorker<CommandsParams, void>;
}

export interface ModkitPluginName {
  dts: 'dts';
}

export interface ModkitPlugin {
  /**
   * 插件名称
   */
  name: keyof ModkitPluginName & string;

  setup: (api: PluginAPI) => PluginHooks;
}
