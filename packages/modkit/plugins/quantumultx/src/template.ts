import { type RuleType, Template, logger } from '@nsnanocat/modkit-shared';

const ruleTypeMap: Record<RuleType, string | undefined> = {
  DOMAIN: 'host',
  'DOMAIN-SUFFIX': 'host-suffix',
  'DOMAIN-KEYWORD': 'host-keyword',
  GEOIP: 'geoip',
  'USER-AGENT': 'user-agent',
  'IP-CIDR': 'ip-cidr',
  'IP-CIDR6': 'ip6-cidr',
  'IP-ASN': 'ip-asn',
  'PROCESS-NAME': 'process',
  FINAL: 'final',
  'DOMAIN-SET': undefined,
  'URL-REGEX': undefined,
  SUBNET: undefined,
  'DEST-PORT': undefined,
  'IN-PORT': undefined,
  'SRC-PORT': undefined,
  'SRC-IP': undefined,
  PROTOCOL: undefined,
  SCRIPT: undefined,
  'CELLULAR-RADIO': undefined,
  'DEVICE-NAME': undefined,
  'RULE-SET': undefined,
};

export class QuantumultxTemplate extends Template {
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

  get Filter() {
    const filters: string[] = [];
    this.content.rule?.forEach((rule: string | object) => {
      switch (typeof rule) {
        case 'string': {
          const [type, content, policyName] = rule.split(',');
          if (ruleTypeMap[type as RuleType]) {
            filters.push([ruleTypeMap[type as RuleType], content, policyName].join(', '));
          } else {
            logger.warn(`[Quantumult X] Unsupported rule type: ${type}`);
          }
          break;
        }
        default:
          logger.warn(`[Quantumult X] Invalid rule type: ${typeof rule}`);
          break;
      }
    });
    return filters.join('\n').trim();
  }

  get Rewrite() {
    const rewrites: string[] = [];
    this.content.rewrite?.forEach((rewrite) => {
      const { type, pattern, mode, content } = rewrite;
      const options = [];
      options.push(pattern);
      options.push('url');
      switch (rewrite.mode) {
        case 'header-add':
          options.push('request-header');
          options.push(content || '');
          break;
        case 'header-del':
          options.push('request-header');
          options.push(" ''");
          break;
        case undefined:
          switch (type) {
            case 'http-request':
              options.push('request-body');
              options.push(content || '');
              break;
            case 'http-response':
              options.push('response-body');
              options.push(content || '');
              break;
            default:
              logger.warn(`[Quantumult X] Unsupported rewrite type: ${type}`);
              break;
          }
          break;
        default:
          logger.warn(`[Quantumult X] Unsupported rewrite mode: ${mode}`);
          break;
      }
      rewrites.push(options.join(' '));
    });
    return `${rewrites.join('\n').trim()}\n${this.#script.rewrite}`;
  }

  get #script() {
    const rewrites: string[] = [];
    const tasks: string[] = [];
    this.content.script?.forEach((script, index: number) => {
      const { type, pattern, cronexp, scriptKey, name } = script;
      const parameters: Record<string, string | number | boolean | undefined> = {};
      parameters['script-path'] = this.utils.getScriptPath(scriptKey);
      parameters.tag = name || `Script${index}`;
      const options = [];
      switch (type) {
        case 'http-request':
          options.push(pattern);
          options.push('url');
          options.push('script-request');
          options.push(parameters['script-path']);
          rewrites.push(`# ${parameters.tag}\n${options.join(' ')}`);
          break;
        case 'http-response':
          options.push(pattern);
          options.push('url');
          options.push('script-response');
          options.push(parameters['script-path']);
          rewrites.push(`# ${parameters.tag}\n${options.join(' ')}`);
          break;
        case 'cron': {
          options.push(cronexp);
          options.push(parameters['script-path']);
          const option = [options.join(' ')];
          option.push(`tag = ${parameters.tag}`);
          //option.push(`img-url = ${imgUrl}`);
          option.push(`enabled = ${true}`);
          tasks.push(option.join(', '));
          break;
        }
        default:
          logger.warn(`[Quantumult X] Unsupported script type: ${type}`);
          break;
      }
    });
    return { rewrite: rewrites.join('\n').trim(), task: tasks.join('\n').trim() };
  }

  get MITM() {
    return this.content.mitm?.hostname?.join(', ');
  }
}
