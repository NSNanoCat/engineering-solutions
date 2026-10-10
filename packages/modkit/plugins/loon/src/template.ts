import { type ModuleMock, Template, logger, objectEntries } from '@nsnanocat/modkit-shared';
import type { LoonArgumentType } from './index';

type LoonMockDataType =
  | 'json'
  | 'text'
  | 'css'
  | 'html'
  | 'javascript'
  | 'plain'
  | 'png'
  | 'gif'
  | 'jpeg'
  | 'tiff'
  | 'svg'
  | 'mp4'
  | 'form-data';

const mockDataTypeMap: Record<LoonMockDataType, string[]> = {
  json: ['application/json', 'text/json'],
  text: ['text/plain'],
  css: ['text/css'],
  html: ['text/html'],
  javascript: ['application/javascript', 'text/javascript'],
  plain: ['text/plain'],
  png: ['image/png'],
  gif: ['image/gif'],
  jpeg: ['image/jpeg'],
  tiff: ['image/tiff'],
  svg: ['image/svg'],
  mp4: ['video/mp4'],
  'form-data': ['multipart/form-data'],
};

export class LoonTemplate extends Template {
  get Metadata() {
    const { name, description, version, system, extra = {} } = this.metadata;
    const result: Record<string, any> = {};
    result.name = name;
    result.desc = description;
    result.version = version;
    result.system = system?.join(', ');
    Object.entries(extra).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? value.join(',') : value;
    });
    return this.renderKeyValuePairs(result, { prefix: '#!' });
  }

  get General() {
    return this.renderKeyValuePairs(this.content.loonGeneral);
  }

  get Rule() {
    return this.content.rule
      ?.map((rule) => {
        if (typeof rule === 'string') {
          return rule;
        }
        switch (rule.type) {
          case 'RULE-SET': {
            let result = `RULE-SET, ${this.utils.getFilePath(rule.assetKey)}`;
            if (rule.policyName) {
              result += `, ${this.normalizeUnion(rule.policyName, 'custom')}`;
            }
            return result;
          }
          default:
            break;
        }
      })
      .join('\n')
      .trim();
  }

  get Argument() {
    return this.source.arguments
      ?.map((arg) => {
        let result = arg.key;
        let type: LoonArgumentType = 'input';
        const argType = typeof arg.type === 'object' ? arg.type.loon || arg.type.default : arg.type;
        if (argType === 'boolean') {
          type = 'switch';
        } else if (arg.options && argType !== 'array') {
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
      .join('\n')
      .trim();
  }

  get Script() {
    return this.content.script
      ?.map((script, index) => {
        let line = '';
        switch (script.type) {
          case 'http-request':
          case 'http-response':
            line += `${script.type} ${script.pattern} `;
            break;
          case 'cron':
            line += `${script.type} "${script.cronexp}" `;
            break;
          case 'generic':
            line += `${script.type} `;
            break;
          // case 'network-changed':
          case 'event':
            line += 'network-changed ';
            break;
          default:
            logger.warn(`[Loon] Unsupported script type: ${script.type}`);
            break;
        }
        line += `script-path=${this.utils.getScriptPath(script.scriptKey)},`;
        line += objectEntries(script)
          .map(([key, value]) => {
            switch (key) {
              case 'name':
                return `tag = ${value || `Script${index}`}`;
              case 'argument':
                return `argument = ${value}`;
              case 'injectArgument': {
                if (!script.argument && value) {
                  return `argument = [${this.source.arguments?.map((item) => `{${item.key}}`).join(',')}]`;
                }
                return '';
              }
              case 'type':
              case 'pattern':
              case 'cronexp':
              case 'scriptKey':
                return '';

              default:
                return `${key} = ${value}`;
            }
          })
          .filter(Boolean)
          .join(', ')
          .trim();
        return line;
      })
      .join('\n')
      .trim();
  }

  get MITM() {
    return this.content.mitm?.hostname?.join(', ');
  }

  get Mock() {
    return this.content.mock
      ?.map((mock) => {
        const { pattern, dataType, data, statusCode } = mock;
        let line = `${pattern.replaceAll(' ', '\\x20')} mock-response-body `;
        if (statusCode) {
          line += `status-code=${statusCode} `;
        }
        const mockDataType = this.#transformMockDataType(mock);
        if (mockDataType) {
          line += `data-type=${mockDataType} `;
        }
        if (dataType === 'base64') {
          line += 'mock-data-is-base64=true ';
        }
        if (typeof data === 'string') {
          const filePath = this.utils.getFilePath(data);
          line += filePath ? `data-path=${filePath} ` : `data="${data}" `;
        } else if (data && 'content' in data) {
          line += `data="${data.content}" `;
        }
        return line;
      })
      .join('\n')
      .trim();
  }

  #transformMockDataType({ dataType, headers }: ModuleMock): LoonMockDataType | undefined {
    if (typeof headers === 'object') {
      const contentType = headers['Content-Type'] || headers['content-type'];
      if (contentType) {
        const [type] = contentType.split(';');
        for (const [key, values] of objectEntries(mockDataTypeMap)) {
          if (values.includes(type)) {
            return key;
          }
        }
      }
    }
    if (dataType === 'text') {
      return 'text';
    }
    return undefined;
  }
}
