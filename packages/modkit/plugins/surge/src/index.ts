import type { ModkitPlugin } from '@nsnanocat/modkit-shared';
import qrcode from 'qrcode-terminal';
import { SurgeTemplate } from './template';

export const pluginSurge = (): ModkitPlugin => {
  return {
    name: 'surge',

    setup(api) {
      const appContext = api.useAppContext();
      let moduleName = '';
      return {
        configurePlatform() {
          return {
            extension: '.sgmodule',
            template: process.env.TEMP || '',
          };
        },
        modifySource({ source }) {
          source ??= {};
          source.arguments = source.arguments?.filter((item) => {
            if (typeof item.type === 'object' && item.type.surge === 'exclude') {
              return false;
            }
            return true;
          });
          moduleName = source.moduleName || '';
          return source;
        },
        templateParameters(params) {
          const surgeTemplate = new SurgeTemplate(params);
          return {
            surgeTemplate,
          };
        },
        onAfterStartDevServer({ rsbuildServer }) {
          const moduleRemoteUrl = `http://${appContext.ip}:${rsbuildServer.port}/${moduleName}.sgmodule`;
          qrcode.generate(`surge:///install-module?url=${encodeURIComponent(moduleRemoteUrl)}`, { small: true });
          api.logger.ready('[Surge] Scan the QR code to install the module, or manually import:', moduleRemoteUrl);
        },
      };
    },
  };
};
