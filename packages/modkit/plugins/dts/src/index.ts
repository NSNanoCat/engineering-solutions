import fs from 'node:fs';
import path from 'node:path';
import type { ArgumentItem, ArgumentType, ModkitPlugin } from '@nsnanocat/modkit-shared';
import { type InterfaceDeclaration, Project, SyntaxKind, type TypeLiteralNode } from 'ts-morph';

const getTypeFromArgumentType = (type: ArgumentType, options?: ArgumentItem['options']): string => {
  if (options?.length) {
    const optionType = options.map((opt) => `'${opt.key}'`).join(' | ');
    return type === 'array' ? `(${optionType})[]` : optionType;
  }
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'array':
      return 'any[]';
    default:
      return 'any';
  }
};

const getArgumentType = (type: ArgumentItem['type']) => (typeof type === 'object' ? type.default : type);

const addNestedProperty = (
  parentNode: InterfaceDeclaration | TypeLiteralNode,
  keys: string[],
  arg: ArgumentItem,
  depth = 0,
): void => {
  const key = keys[depth];

  if (depth === keys.length - 1) {
    // 最后一个 key，直接添加属性
    const type = getTypeFromArgumentType(getArgumentType(arg.type), arg.options);
    const property = parentNode.addProperty({
      name: key,
      type,
      hasQuestionToken: true,
    });

    // 构建 TSDoc 注释
    const comments = [];
    if (arg.name) {
      comments.push(arg.name);
    }
    if (arg.description) {
      comments.push(`\n${arg.description}`);
    }
    if (arg.options?.length) {
      comments.push('\n@remarks\n\nPossible values:');
      arg.options.forEach((opt) => {
        comments.push(`- \`'${opt.key}'\`${opt.label ? ` - ${opt.label}` : ''}`);
      });
    }
    if (arg.defaultValue !== undefined) {
      comments.push(`\n@defaultValue ${JSON.stringify(arg.defaultValue)}`);
    }
    if (comments.length) {
      property.addJsDoc(comments.join('\n').trim());
    }

    return;
  }

  const childNode =
    parentNode.getKind() === SyntaxKind.InterfaceDeclaration
      ? (parentNode as InterfaceDeclaration).getProperty(key)
      : (parentNode as TypeLiteralNode).getProperty(key);

  if (!childNode) {
    // 如果属性不存在，创建新的嵌套对象
    const newProperty = parentNode.addProperty({
      name: key,
      type: '{}',
      hasQuestionToken: true,
    });
    const typeLiteral = newProperty.getTypeNode() as TypeLiteralNode;
    addNestedProperty(typeLiteral, keys, arg, depth + 1);
  } else {
    // 如果属性已存在，检查其类型
    const propType = childNode.getTypeNode();
    if (propType?.getKind() === SyntaxKind.TypeLiteral) {
      // 如果是对象类型，递归添加属性
      addNestedProperty(propType as TypeLiteralNode, keys, arg, depth + 1);
    } else {
      // 如果不是对象类型，替换为新的对象类型
      childNode.setType('{}');
      const newTypeLiteral = childNode.getTypeNode() as TypeLiteralNode;
      addNestedProperty(newTypeLiteral, keys, arg, depth + 1);
    }
  }
};

export interface DtsPluginOptions {
  /**
   * 生成的类型名称
   * @default 'Arguments'
   */
  interfaceName?: string;
  /**
   * 生成的类型是否导出
   * @default false
   */
  isExported?: boolean;
  /**
   * 生成的类型文件路径
   * @default 'src/arguments.d.ts'
   */
  filePath?: string;
  /**
   * tsconfig.json 文件路径
   */
  tsconfigPath?: string;
}

export const pluginDts = ({
  interfaceName = 'Arguments',
  isExported = false,
  filePath = 'src/arguments.d.ts',
  tsconfigPath = 'tsconfig.json',
}: DtsPluginOptions = {}): ModkitPlugin => ({
  name: 'dts',

  setup: (api) => {
    let argumentItems: ArgumentItem[] = [];
    const { appDirectory } = api.useAppContext();

    function generateDts() {
      const tsconfigFilePath = path.resolve(appDirectory, tsconfigPath);
      const dtsFilePath = path.resolve(appDirectory, filePath);
      if (fs.existsSync(dtsFilePath)) {
        fs.unlinkSync(dtsFilePath);
      }
      const project = new Project({
        tsConfigFilePath: fs.existsSync(tsconfigFilePath) ? tsconfigFilePath : undefined,
      });
      const sourceFile = project.createSourceFile(dtsFilePath, '');
      const argumentsInterface = sourceFile.addInterface({
        name: interfaceName,
        isExported,
      });
      argumentItems.forEach((arg) => {
        const keys = arg.key.split('.');
        addNestedProperty(argumentsInterface, keys, arg);
      });
      sourceFile.saveSync();
      api.logger.success(`Generated ${path.relative(appDirectory, dtsFilePath)}`);
    }

    return {
      templateParameters: ({ source }) => {
        argumentItems = source?.arguments || [];
        return {};
      },
      onBeforeStartDevServer: generateDts,
      commands: ({ program }) => {
        program.command('dts').description('generate typescript interface file for arguments').action(generateDts);
      },
    };
  },
});
