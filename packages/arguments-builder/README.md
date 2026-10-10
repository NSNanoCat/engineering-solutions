# @nsnanocat/arguments-builder

用于统一维护项目参数配置的构建

## 安装

```bash
pnpm add -D @nsnanocat/arguments-builder
# or
npm add -D @nsnanocat/arguments-builder
```

## 配置文件

默认读取 `arguments-builder.config.(ts|js|mjs)` 文件，支持 `-c` 或 `--config` 指定配置文件

```ts
import { defineConfig } from "@nsnanocat/arguments-builder";

export default defineConfig({
  // ...
});
```

```js
/**
 * @type {import('@nsnanocat/arguments-builder').ArgumentsBuilderConfig}
 */
module.exports = {
  // ...
};
```

## 配置

### ArgumentsBuilderConfig

| 参数   | 类型                            | 描述         |
| ------ | ------------------------------- | ------------ |
| output | [Output](#Output)               | 输出文件配置 |
| args   | [ArgumentItem](#ArgumentItem)[] | 参数配置     |

### Output

| 参数          | 类型                                    | 描述                                                                                                                                        |
| ------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| surge         | { path?: string; template?: string; }   | surge 输出内容配置。`path` 为输出路径，`template` 为模版路径                                                                                |
| loon          | { path?: string; template?: string; }   | loon 输出内容配置。`path` 为输出路径，`template` 为模版路径                                                                                 |
| boxjsSettings | { path?: string; scope?: string }       | boxjs 的 settings 部分内容的输出内容配置。`path` 为输出路径，`scope` 为存储键的前缀                                                         |
| dts           | { path?: string; isExported?: boolean } | 输出 dts 文件的配置。`isExported` 默认根据输出文件后缀自动判断，及 `.d.ts` 文件认为是全局类型，则 `isExported` 为 `false`；`.ts` 文件则反之 |

### ArgumentItem

| 参数         | 类型                                                                                                                                  | 描述                                                  |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| key          | string **（必填）**                                                                                                                   | 参数 key                                              |
| type         | 'string' \| 'number' \| 'boolean' \| 'array' **（必填）**                                                                             | 参数类型                                              |
| boxJsType    | 'text' \| 'slider' \| 'boolean' \| 'textarea' \| 'radios' \| 'checkboxes' \| 'colorpicker' \| 'number' \| 'selects' \| 'modalSelects' | 自动的映射关系无法满足时，可以使用 boxJsType 来自定义 |
| name         | string                                                                                                                                | 参数描述                                              |
| description  | string                                                                                                                                | 参数简介                                              |
| defaultValue | any                                                                                                                                   | 默认值                                                |
| options      | array                                                                                                                                 | 选项                                                  |
| placeholder  | string                                                                                                                                | 输入框占位符                                          |
| exclude      | Array<'surge'\| 'loon' \| 'boxjs' \| 'dts'>                                                                                           | 当前参数在哪些平台上不生效                            |

## CLI

### 输出 dts 文件

用于开发阶段输出根据当前参数配置输出类型文件，方便类型推导

```bash
npx arguments-builder dts
```

### 生成 module 文件

#### 一键生成

根据模版自动生成 `surge`、`loon` 的 module 文件，以及 `boxjs` 的 settings 部分的 JSON 文件

```bash
npx arguments-builder build
```

#### 单独生成

命令行工具保留了分别生成单独平台文件的能力

```bash
npx arguments-builder (surge|loon|boxjs)
```

### 通用参数

所有命令均支持 `-c` 或 `--config` 指定配置文件。

例如以下场景

```ts
// arguments-builder.config.ts
import { defineConfig } from "@nsnanocat/arguments-builder";

export default defineConfig({
  // ...
});

// arguments-builder.beta.config.ts
import defaultConfig from "./arguments-builder.config.ts";
import { defineConfig } from "@nsnanocat/arguments-builder";

export default defineConfig({
  ...defaultConfig,
  args: [
    ...defaultConfig.args,
    {
      // ...
    },
  ],
});
```

## Node API

```ts
import { ArgumentsBuilder } from "@nsnanocat/arguments-builder";

const argumentsBuilder = new ArgumentsBuilder();
```
