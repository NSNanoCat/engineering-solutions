import type { ModkitPlugin } from '@nsnanocat/modkit-shared';

export type BoxJsType =
  | 'text'
  | 'slider'
  | 'boolean'
  | 'textarea'
  | 'radios'
  | 'checkboxes'
  | 'colorpicker'
  | 'number'
  | 'selects'
  | 'modalSelects';

export interface BoxJsPluginOptions {
  scope?: string;
}

export const pluginBoxJs = ({ scope = '' }: BoxJsPluginOptions = {}): ModkitPlugin => {
  return {
    name: 'boxjs',
    setup() {
      return {
        configurePlatform() {
          return {
            extension: '.json',
            template: '<%= JSON.stringify(settings, null, 4) %>',
          };
        },
        modifySource({ source }) {
          source ??= {};
          source.arguments = source.arguments?.filter((item) => {
            if (typeof item.type === 'object' && item.type.boxJs === 'exclude') {
              return false;
            }
            return true;
          });
          return source;
        },
        templateParameters({ source }) {
          const settings =
            source?.arguments?.map((arg) => {
              let type: BoxJsType = 'text';
              if (typeof arg.type === 'object') {
                type = (arg.type.boxJs as BoxJsType) || arg.type.default;
              } else {
                if (arg.type === 'boolean') {
                  type = 'boolean';
                }
                if (arg.type === 'number') {
                  type = 'number';
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
            }) ?? [];

          return { settings };
        },
      };
    },
  };
};
