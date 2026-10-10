import type { ModkitPlugin } from '@nsnanocat/modkit-shared';
import { LoonTemplate } from './template';

export type LoonArgumentType = 'input' | 'select' | 'switch' | 'exclude';

export const pluginLoon = (): ModkitPlugin => {
  return {
    name: 'loon',
    setup() {
      return {
        configurePlatform() {
          return {
            extension: '.plugin',
            template: process.env.TEMP || '',
          };
        },
        modifySource({ source }) {
          source ??= {};
          source.arguments = source.arguments?.filter((item) => {
            if (typeof item.type === 'object' && item.type.loon === 'exclude') {
              return false;
            }
            return true;
          });
          return source;
        },
        templateParameters(params) {
          const loonTemplate = new LoonTemplate(params);
          return {
            loonTemplate,
          };
        },
      };
    },
  };
};
