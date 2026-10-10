import fs from 'node:fs';
import type http from 'node:http';
import path from 'node:path';
import {
  AppContext,
  commander,
  handleArgumentsDefaultValue,
  initAppContext,
  initAppDir,
  loadConfig,
  loadPlugins,
  logger,
  manager,
  runMaybeAsync,
} from '@nsnanocat/modkit-shared';
import type { RsbuildInstance } from '@rsbuild/core';
import express from 'express';
import minimist from 'minimist';
import { useRsbuild } from './rsbuild';

export class ModKitCli {
  // 使用 minimist 解析命令行参数，支持 `-c` 或 `--config` 作为配置文件参数
  cliParams = minimist<{
    c?: string;
    config?: string;
  }>(process.argv.slice(2));

  program = commander.program;

  buildCommand = this.program.command('build');
  devCommand = this.program.command('dev');

  rsbuild!: RsbuildInstance;
  hooksRunner!: Awaited<ReturnType<typeof manager.init>>;

  constructor() {
    logger.greet(`  ModKit v${process.env.MODKIT_VERSION}\n`);

    // 设置 MODKIT 根目录，如果没有设置则使用当前工作目录
    process.env.MODKIT_ROOT ??= process.cwd();

    this.program.version(process.env.MODKIT_VERSION || '0.0.0');

    [this.buildCommand, this.devCommand].forEach((command) => {
      command.option('-c --config <config>', 'specify the configuration file, can be a relative or absolute path');
    });
  }

  async run() {
    const { configFilePath } = await this.#init();

    await this.hooksRunner.commands({ program: this.program });

    this.#handleBuildCommand();
    this.#handleDevCommand({ configFilePath });

    await this.program.parseAsync(process.argv);
  }

  async #init() {
    // 清空插件管理器中的插件
    manager.clear();
    const appDirectory = await initAppDir(process.env.MODKIT_ROOT);

    // 加载配置文件，优先使用命令行指定的配置文件路径
    const { config, configFilePath } = await loadConfig(this.cliParams.config || this.cliParams.c);

    if (!config?.source) {
      logger.error('source config is required');
      process.exit(1);
    }

    // 加载插件，并注册到插件管理器中
    const plugins = loadPlugins(config);
    plugins.forEach((plugin) => plugin && manager.usePlugin(plugin));

    // 初始化应用程序上下文，设置应用的根目录
    const appContext = initAppContext({
      appDirectory,
    });
    AppContext.set(appContext);

    // 初始化插件管理器，执行插件的钩子函数
    this.hooksRunner = await manager.init();

    // 执行一些插件钩子函数，处理平台配置、修改源代码和处理命令行参数，此处并不消费，供插件内部共享上下文
    await Promise.allSettled([
      this.hooksRunner.configurePlatform,
      runMaybeAsync(this.hooksRunner.modifySource, { source: config.source }),
      runMaybeAsync(this.hooksRunner.templateParameters, {
        source: config.source,
        getFilePath: () => '',
        getScriptPath: () => '',
        handleArgumentsDefaultValue,
      }),
    ]);

    const { rsbuild } = await useRsbuild({ config, plugins, appContext });
    this.rsbuild = rsbuild;

    return {
      configFilePath,
    };
  }

  #handleBuildCommand() {
    this.buildCommand.action(async () => {
      process.env.NODE_ENV = 'production';

      await runMaybeAsync(this.hooksRunner.onBeforeBuild);
      await this.rsbuild.build();
      await runMaybeAsync(this.hooksRunner.onAfterBuild, { distPath: this.rsbuild.context.distPath });
    });
  }

  #handleDevCommand({ configFilePath }: { configFilePath: string }) {
    let isFirstCompile = true;
    let devHttpServer: http.Server;

    const startDevServer = async () => {
      if (devHttpServer) {
        devHttpServer.close();
      }
      const app = express();
      await runMaybeAsync(this.hooksRunner.onBeforeStartDevServer, { app, isFirstCompile });

      const rsbuildServer = await this.rsbuild.createDevServer();
      app.use(this.#devServerMiddlewares).use(rsbuildServer.middlewares);

      const httpServer = app.listen(rsbuildServer.port, async () => {
        // 在服务器启动后执行钩子函数
        await rsbuildServer.afterListen();
      });
      devHttpServer = httpServer;
      await runMaybeAsync(this.hooksRunner.onAfterStartDevServer, { app, isFirstCompile, httpServer, rsbuildServer });

      isFirstCompile = false;
    };

    this.devCommand.action(async () => {
      process.env.NODE_ENV = 'development';
      fs.watchFile(configFilePath, async () => {
        if (process.stdout.isTTY) {
          process.stdout.write('\x1B[H\x1B[2J');
        }
        logger.info('Restarting server...\n');

        await this.#init();
        startDevServer();
      });

      startDevServer();
    });
  }

  #devServerMiddlewares(req: express.Request, res: express.Response, next: express.NextFunction) {
    const ext = path.extname(req.url);
    switch (ext) {
      case '.json':
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        break;
      case '.js':
      case '.cjs':
      case '.mjs':
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        break;
      case '.html':
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        break;
      default:
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        break;
    }

    next();
  }
}
