import { Template, logger, objectEntries, toKebabCase } from '@nsnanocat/modkit-shared';

export class SurgeTemplate extends Template {
  get Metadata() {
    const { name, description, system, version, extra = {} } = this.metadata;
    const { argumentsText, argumentsDescription } = this.#handleArguments();
    const result: Record<string, any> = {};
    result.name = name;
    result.desc = description;
    result.version = version;
    if (system) {
      result.requirement = system?.map((item) => `SYSTEM = ${item}`).join(' || ');
    }
    if (argumentsText) {
      result.arguments = argumentsText;
    }
    if (argumentsDescription) {
      result['arguments-desc'] = argumentsDescription;
    }
    objectEntries(extra).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? value.join(', ') : value;
    });
    return this.renderKeyValuePairs(result, { prefix: '#!' });
  }

  get General() {
    return this.renderKeyValuePairs(this.content.surgeGeneral).trim();
  }

  get Host() {
    return this.renderKeyValuePairs(this.content.host).trim();
  }

  get Rule() {
    const rules: string[] = [];
    this.content.rule?.forEach((rule) => {
      switch (typeof rule) {
        case 'object':
          switch (rule.type) {
            case 'RULE-SET': {
              let result = `RULE-SET, ${this.utils.getFilePath(rule.assetKey)}`;
              if (rule.policyName) {
                result += `, ${this.normalizeUnion(rule.policyName, 'custom')}`;
              }
              if (rule.description) {
                result += ` // ${rule.description}`;
              }
              rules.push(result);
              break;
            }
            default:
              break;
          }
          break;
        case 'string':
          rules.push(rule);
          break;
        default:
          logger.error(`Invalid rule type: ${typeof rule}`);
          break;
      }
    });
    return rules.join('\n').trim();
  }

  get Script() {
    const scripts: string[] = [];
    const { scriptParams } = this.#handleArguments();
    this.content.script?.forEach((script, index) => {
      const parameters: Record<string, any> = {};
      const { name, scriptKey, debug, injectArgument, argument, extra, ...rest } = script;
      parameters['script-path'] = this.utils.getScriptPath(scriptKey);

      objectEntries({ ...rest, ...extra }).forEach(([key, value]) => {
        if (value !== undefined) {
          parameters[toKebabCase(key as string)] = value.toString();
        }
      });
      if (injectArgument || argument) {
        parameters.argument = argument || scriptParams;
      }

      if (debug || process.env.NODE_ENV === 'development') {
        parameters.debug = true;
      }
      scripts.push(
        `${name || `script${index}`} = ${this.renderKeyValuePairs(parameters, { join: ', ', separator: '=' })}`,
      );
    });
    return scripts.join('\n').trim();
  }

  get MITM() {
    if (!this.content.mitm) {
      return '';
    }
    let result = '';
    if (this.content.mitm.hostname?.length) {
      result += `hostname = %APPEND% ${this.content.mitm.hostname.join(', ')}\n`;
    }
    if (this.content.mitm.clientSourceAddress?.length) {
      result += `client-source-address = %APPEND% ${this.content.mitm.clientSourceAddress.join(', ')}\n`;
    }
    return result.trim();
  }

  get #rewrite() {
    const urlRewrites: string[] = [];
    const headerRewrites: string[] = [];
    const bodyRewrites: string[] = [];
    this.content.rewrite?.forEach((rewrite) => {
      switch (rewrite.mode) {
        case 'header':
        case 302:
        case 'reject': {
          const options = [];
          options.push(rewrite.pattern);
          options.push(rewrite.content);
          options.push(rewrite.mode);
          urlRewrites.push(options.join(' '));
          break;
        }
        case 'header-add':
        case 'header-del':
        case 'header-replace-regex': {
          if (typeof rewrite.content === 'string') {
            headerRewrites.push([rewrite.type, rewrite.pattern, rewrite.mode, rewrite.content].join(' '));
            break;
          }
          Object.entries(rewrite.content).forEach(([key, value]) => {
            headerRewrites.push([rewrite.type, rewrite.pattern, rewrite.mode, key, value].join(' '));
          });
          break;
        }
        default: {
          if (typeof rewrite.content === 'string') {
            headerRewrites.push([rewrite.type, rewrite.pattern, rewrite.content].join(' '));
            break;
          }
          bodyRewrites.push(
            [
              rewrite.type,
              rewrite.pattern,
              ...Object.entries(rewrite.content).map(([key, value]) => [key, value].join(' ')),
            ].join(' '),
          );
          break;
        }
      }
    });
    return {
      url: urlRewrites.join('\n').trim(),
      header: headerRewrites.join('\n').trim(),
      body: bodyRewrites.join('\n').trim(),
    };
  }

  get URLRewrite() {
    return this.#rewrite.url;
  }

  get HeaderRewrite() {
    return this.#rewrite.header;
  }

  get BodyRewrite() {
    return this.#rewrite.body;
  }

  get MapLocal() {
    const mapLocals: string[] = [];
    this.content.mock?.forEach((mock) => {
      const options: string[] = [];
      options.push(mock.pattern);
      if (mock.dataType) {
        options.push(`data-type=${mock.dataType}`);
      }
      if (typeof mock.data === 'string') {
        options.push(`data="${this.utils.getFilePath(mock.data) || mock.data}"`);
      } else if (!!mock.data && 'content' in mock.data) {
        options.push(`data="${mock.data.content}"`);
      }
      if (mock.statusCode) {
        options.push(`status-code=${mock.statusCode}`);
      }
      if (mock.headers) {
        switch (typeof mock.headers) {
          case 'string':
            options.push(`header="${mock.headers}"`);
            break;
          case 'object': {
            const header = Object.entries(mock.headers)
              .map((value) => value.join(':'))
              .join('|');
            options.push(`header="${header}"`);
            break;
          }
          default:
            break;
        }
      }
      mapLocals.push(options.join(' '));
    });
    return mapLocals.join('\n').trim();
  }

  #handleArguments() {
    const args = this.source?.arguments || [];
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
      .join('\n')
      .replace(/\n/g, '\\n');

    const scriptParams = args.map((item) => `${item.key}={{{${item.key}}}}`).join('&');

    return {
      argumentsText,
      argumentsDescription,
      scriptParams,
    };
  }
}
