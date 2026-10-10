import fs from 'node:fs';
import path from 'node:path';
import type { ModkitPlugin } from '@nsnanocat/modkit-shared';
import { Surge2Egern } from '@nsnanocat/surge2egern';

export const pluginEgern = (): ModkitPlugin => {
  return {
    name: 'egern',

    setup() {
      return {
        async onAfterBuild({ distPath }) {
          if (!distPath || !fs.existsSync(distPath)) {
            return;
          }
          const surgeModules = fs.readdirSync(distPath).reduce<string[]>((acc, file) => {
            if (path.extname(file) === '.sgmodule') {
              acc.push(path.join(distPath, file));
            }
            return acc;
          }, []);
          const surge2egern = new Surge2Egern();
          try {
            for (const surgeModule of surgeModules) {
              const text = await fs.promises.readFile(surgeModule, 'utf-8');
              const result = await surge2egern.transformModule(text);
              const targetPath = surgeModule.replace('.sgmodule', '.yaml');
              await fs.promises.writeFile(targetPath, result);
            }
          } finally {
            await surge2egern.destroy();
          }
        },
      };
    },
  };
};
