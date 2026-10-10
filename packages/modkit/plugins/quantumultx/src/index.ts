import type { ModkitPlugin } from '@nsnanocat/modkit-shared';
import { QuantumultxTemplate } from './template';

export const pluginQuantumultx = (): ModkitPlugin => {
  return {
    name: 'quantumultx',
    setup() {
      return {
        configurePlatform() {
          return {
            extension: '.snippet',
            template: process.env.TEMP || '',
          };
        },
        modifySource({ source }) {
          source ??= {};
          source.arguments = source.arguments?.filter((item) => {
            if (typeof item.type === 'object' && item.type.quantumultx === 'exclude') {
              return false;
            }
            return true;
          });
          return source;
        },
        templateParameters(params) {
          const quantumultxTemplate = new QuantumultxTemplate(params);
          return {
            quantumultxTemplate,
          };
        },
      };
    },
  };
};
