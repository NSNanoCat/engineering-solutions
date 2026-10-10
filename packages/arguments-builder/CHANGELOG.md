# @iringo/arguments-builder

## 1.8.7

### Patch Changes

- Publish npm releases through the repository's GitHub Actions trusted publisher using OIDC, without a stored npm publishing token. Keep the public APIs unchanged.
- Updated dependencies
  - @nsnanocat/utils@1.0.4
  - @nsnanocat/surge2egern@1.2.2

## 1.8.6

### Patch Changes

- Generate valid array properties from numeric argument indices, including nested arrays. Report configuration generation and conversion failures through a nonzero CLI exit code, and release Chrome after conversion or initialization failure.
- Migrate the public packages to the NSNanoCat scope. Keep the existing APIs, CLI names and module entry points.
- Updated dependencies
  - @nsnanocat/surge2egern@1.2.1
  - @nsnanocat/utils@1.0.3

## 1.8.5

### Patch Changes

- e30f006: 关闭 surge2Egern

## 1.8.4

### Patch Changes

- Updated dependencies [e1bb717]
  - @iringo/surge2egern@1.2.0

## 1.8.3

### Patch Changes

- Updated dependencies [e83ede4]
  - @iringo/utils@1.0.2

## 1.8.2

### Patch Changes

- Updated dependencies [be34489]
  - @iringo/surge2egern@1.1.0

## 1.8.1

### Patch Changes

- Updated dependencies [0878f0e]
  - @iringo/surge2egern@1.0.1

## 1.8.0

### Minor Changes

- 45d3861: 支持 Egern 转换

## 2.0.0

### Major Changes

- d2754aa: first version

## 1.7.8

### Patch Changes

- 99a1956: 修复 surge 的 script 参数可能被截断的问题

## 1.7.7

### Patch Changes

- 0f2eee2: 修复默认参数错误问题

## 1.7.6

### Patch Changes

- e137211: 修复默认值为数组的情况丢失参数的问题

## 1.7.5

### Patch Changes

- 0ef69e3: WIP: 完成部分插件功能
- Updated dependencies [0ef69e3]
  - @iringo/utils@1.0.1

## 1.7.4

### Patch Changes

- 87b2d64: 修复默认参数错误

## 1.7.3

### Patch Changes

- d5aad17: 修复分割换行不生效的问题

## 1.7.2

### Patch Changes

- 74081f0: bump version

## 1.7.1

### Patch Changes

- 112f686: 修改依赖方式

## 1.7.0

### Minor Changes

- de261d3: 修改 splitLines 为 split，支持自定义分割符

## 1.6.0

### Minor Changes

- 6911c43: 增加 splitLines helper

## 1.5.0

### Minor Changes

- 6217566: 新增 `@package` helper 用于获取 `package.json` 中的内容

## 1.4.2

### Patch Changes

- 025dff4: 修复 surge 模板默认值生成错误的问题

## 1.4.1

### Patch Changes

- 3028257: 修复输出目标目录可能不存在而写入失败的问题

## 1.4.0

### Minor Changes

- 5683bc8: 模板增加 version 变量

## 1.3.0

### Minor Changes

- 9876397: 修改 loon 的输出方案，多选的参数降级为 input

## 1.2.0

### Minor Changes

- e3ebb12: 修改配置文件格式

## 1.1.2

### Patch Changes

- dded7d3: 修复未编译产物的问题

## 1.1.0

### Minor Changes

- 4f28cc1: 新增模版变量 now 用于输出当前时间
