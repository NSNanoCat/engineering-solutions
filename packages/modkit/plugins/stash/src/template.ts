import { type RuleType, Template, logger } from '@nsnanocat/modkit-shared';
import YAML from 'yaml';
import type { StashOverride } from './types';

export class StashTemplate extends Template {
  get output() {
    return YAML.stringify(this.#override);
  }

  get #override(): StashOverride {
    const { name, description, version, system, ...rest } = this.metadata;
    const result: StashOverride = {};
    result.name = name;
    result.desc = description;
    result.version = version;
    result.system = system;
    Object.entries(rest).forEach(([key, value]) => {
      result[key] = Array.isArray(value) ? value.join('\n') : value;
    });

    this.content.rule?.forEach((rule) => {
      if (typeof rule === 'string') {
        const [type, ...contents] = rule.split(',') as [RuleType, ...string[]];
        result.rule ??= [];
        switch (type) {
          case 'DOMAIN-SET':
          case 'USER-AGENT':
          case 'URL-REGEX':
          case 'SUBNET':
          case 'DEST-PORT':
          case 'IN-PORT':
          case 'SRC-PORT':
          case 'SRC-IP':
          case 'PROTOCOL':
          case 'CELLULAR-RADIO':
          case 'DEVICE-NAME':
          case 'FINAL':
            logger.warn(`[Stash] Unsupported rule type: ${type}`);
            break;

          default:
            result.rule.push(`${type}, ${contents.join(',')}`);
            break;
        }
      } else if (rule.type === 'RULE-SET') {
        result.rule ??= [];
        const assetKey = rule.assetKey.replace(/\./g, '-');
        result.rule.push(`RULE-SET, ${assetKey}, ${rule.policyName ?? ''}`);

        result['rule-providers'] ??= {};
        result['rule-providers'][assetKey] = {
          behavior: 'classical',
          format: 'text',
          url: this.utils.getFilePath(rule.assetKey),
        };
      }
    });

    result.http ??= {};

    if (this.content.mitm?.hostname?.length) {
      result.http.mitm = this.content.mitm.hostname;
    }

    this.content.script?.forEach((script) => {
      result.http ??= {};
      result.http.script ??= [];
      if (['http-request', 'http-response'].includes(script.type)) {
        result.http.script.push({
          match: script.pattern,
          name: script.scriptKey,
          type: script.type === 'http-request' ? 'request' : 'response',
          'require-body': script.requiresBody,
          timeout: script.timeout,
          debug: script.debug,
          'binary-mode': script.binaryBodyMode,
          'max-size': script.maxSize,
        });
        result['script-providers'] ??= {};
        result['script-providers'][script.scriptKey] = {
          url: this.utils.getScriptPath(script.scriptKey),
          interval: script.scriptUpdateInterval,
        };
      }
    });

    return result;
  }
}
