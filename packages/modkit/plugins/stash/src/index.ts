import type { ModkitPlugin } from '@nsnanocat/modkit-shared';
import { StashTemplate } from './template';

export const pluginStash = (): ModkitPlugin => {
  return {
    name: 'stash',
    setup() {
      return {
        configurePlatform() {
          return {
            extension: '.stoverride',
            template: '<%= output %>',
          };
        },
        modifySource({ source }) {
          source ??= {};
          source.arguments = source.arguments?.filter((item) => {
            if (typeof item.type === 'object' && item.type.stash === 'exclude') {
              return false;
            }
            return true;
          });
          return source;
        },
        templateParameters(params) {
          const stashTemplate = new StashTemplate(params);
          return {
            output: stashTemplate.output,
          };
        },
      };
    },
  };
};
