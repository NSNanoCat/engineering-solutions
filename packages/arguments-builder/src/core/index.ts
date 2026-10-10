import { Project, SyntaxKind } from 'ts-morph';

import type { InterfaceDeclaration, TypeLiteralNode } from 'ts-morph';
import type { ArgumentItem, ArgumentType, ArgumentsBuilderOptions, BoxJsType, LoonType } from './types';

export class ArgumentsBuilder {
  constructor(private readonly options: ArgumentsBuilderOptions) {}

  public buildBoxJsSettings(scope = '') {
    return this.getArgumentByScope('boxjs').map((arg) => {
      let type: BoxJsType = 'text';
      if (arg.boxJsType) {
        type = arg.boxJsType;
      } else {
        if (arg.type === 'boolean') {
          type = 'boolean';
        }
        if (arg.options) {
          if (arg.type === 'array') {
            type = 'checkboxes';
          } else {
            type = 'selects';
          }
        }
      }
      return {
        id: `${scope ? `${scope}.` : ''}${arg.key}`,
        name: arg.name,
        type,
        val: arg.defaultValue,
        items: arg.options,
        desc: arg.description,
        placeholder: arg.placeholder,
      };
    });
  }

  public buildSurgeArguments() {
    const args = this.getArgumentByScope('surge');
    const argumentsText = args.map((arg) => `${arg.key}:${this.getDefaultValue(arg.defaultValue)}`).join(',');

    const argumentsDescription = args
      .map((arg) => {
        let result = arg.key;
        if (arg.name) {
          result += `: ${arg.name}`;
        }
        if (arg.options?.length) {
          result += '\n';
          result += arg.options
            .map((option, index, array) => {
              const prefix = index === array.length - 1 ? '└' : '├';
              return `    ${prefix} ${option.key}: ${option.label ?? option.key}`;
            })
            .join('\n');
        }
        if (arg.description) {
          result += `\n${arg.description}`;
        }
        result += '\n';
        return result;
      })
      .join('\n');

    const scriptParams = args.map((item) => `${item.key}="{{{${item.key}}}}"`).join('&');

    return {
      argumentsText,
      argumentsDescription,
      scriptParams,
    };
  }

  public buildLoonArguments() {
    const args = this.getArgumentByScope('loon');
    const argumentsText = args
      .map((arg) => {
        let result = arg.key;
        let type: LoonType = 'input';
        if (arg.type === 'boolean') {
          type = 'switch';
        } else if (arg.options && arg.type !== 'array') {
          // 只有在有选项且不是数组类型时才使用 select
          type = 'select';
        }
        result += ` = ${type}`;
        result += `,${this.getDefaultValue(arg.defaultValue)}`;
        if (arg.options && type === 'select') {
          result += ',';
          result += arg.options
            .filter((item) => item.key !== arg.defaultValue)
            .map((option) => `${this.getDefaultValue(option.key)}`)
            .join(',');
        }
        if (arg.name) {
          result += `,tag=${arg.name}`;
        }
        if (arg.description) {
          result += `,desc=${arg.description}`;
        }
        return result;
      })
      .join('\n');

    const scriptParams = `[${args.map((item) => `{${item.key}}`).join(',')}]`;
    return {
      argumentsText,
      scriptParams,
    };
  }

  public buildDtsArguments({ isExported = true } = {}) {
    const project = new Project({
      useInMemoryFileSystem: true,
    });
    const sourceFile = project.createSourceFile('settings.ts', '');
    const settingsInterface = sourceFile.addInterface({
      name: 'Settings',
      isExported,
    });
    const args = this.getArgumentByScope('dts');

    function getTypeFromArgumentType(type: ArgumentType, options?: ArgumentItem['options']): string {
      if (options && options.length > 0) {
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
    }

    function addNestedProperty(
      parentNode: InterfaceDeclaration | TypeLiteralNode,
      keys: string[],
      arg: ArgumentItem,
      depth = 0,
      inArray = false,
    ): void {
      const key = keys[depth];
      let arrayDepth = 0;
      while (/^\d+$/.test(keys[depth + arrayDepth + 1] ?? '')) {
        arrayDepth++;
      }
      const nextDepth = depth + arrayDepth + 1;
      const existing = parentNode.getProperty(key);

      if (nextDepth === keys.length) {
        // 最后一个 key，直接添加属性
        let type = getTypeFromArgumentType(arg.type, arg.options);
        if ((arrayDepth || inArray) && existing) {
          let element = existing.getTypeNodeOrThrow();
          for (let index = 0; index < arrayDepth; index++) {
            element = element.asKindOrThrow(SyntaxKind.ArrayType).getElementTypeNode();
            if (element.getKind() === SyntaxKind.ParenthesizedType) {
              element = element.asKindOrThrow(SyntaxKind.ParenthesizedType).getTypeNode();
            }
          }
          type = `${element.getText()} | ${type}`;
        }
        for (let index = 0; index < arrayDepth; index++) {
          type = `(${type})[]`;
        }
        const property =
          existing ??
          parentNode.addProperty({
            name: key,
            type,
            hasQuestionToken: true,
          });
        property.setType(type);

        // 构建 TSDoc 注释
        let comment = '';
        if (arg.name) {
          comment += `${arg.name}\n`;
        }
        if (arg.description) {
          comment += `\n${arg.description}\n`;
        }
        if (arg.options && arg.options.length > 0) {
          comment += '\n@remarks\n\nPossible values:\n';
          arg.options.forEach((opt) => {
            comment += `- \`'${opt.key}'\`${opt.label ? ` - ${opt.label}` : ''}\n`;
          });
        }
        if (arg.defaultValue !== undefined) {
          comment += `\n@defaultValue ${JSON.stringify(arg.defaultValue)}`;
        }
        if (comment) {
          property.addJsDoc(comment.trim());
        }

        return;
      }

      const childNode =
        existing ??
        parentNode.addProperty({
          name: key,
          type: `{}${'[]'.repeat(arrayDepth)}`,
          hasQuestionToken: true,
        });
      let typeNode = childNode.getTypeNodeOrThrow();
      for (let index = 0; index < arrayDepth; index++) {
        typeNode = typeNode.asKindOrThrow(SyntaxKind.ArrayType).getElementTypeNode();
      }
      if (typeNode.getKind() !== SyntaxKind.TypeLiteral) {
        childNode.setType(`{}${'[]'.repeat(arrayDepth)}`);
        typeNode = childNode.getTypeNodeOrThrow();
        for (let index = 0; index < arrayDepth; index++) {
          typeNode = typeNode.asKindOrThrow(SyntaxKind.ArrayType).getElementTypeNode();
        }
      }
      addNestedProperty(
        typeNode.asKindOrThrow(SyntaxKind.TypeLiteral),
        keys,
        arg,
        nextDepth,
        inArray || arrayDepth > 0,
      );
    }

    args.forEach((arg) => {
      const keys = arg.key.replace(/\[(\d+)\]/g, '.$1').split('.');
      addNestedProperty(settingsInterface, keys, arg);
    });

    return sourceFile.getFullText();
  }

  private getDefaultValue(defaultValue: any): any {
    switch (typeof defaultValue) {
      case 'string':
        return `"${defaultValue}"`;
      case 'number':
      case 'boolean':
        return defaultValue;
      case 'object':
        if (Array.isArray(defaultValue) && defaultValue.length > 0) {
          return `"${defaultValue.join(',')}"`;
        }
        return '""';
      default:
        return '""';
    }
  }

  private getArgumentByScope(scope: NonNullable<ArgumentItem['exclude']>[number]) {
    return this.options.args?.filter((item) => !(item.exclude ?? []).includes(scope)) ?? [];
  }
}
