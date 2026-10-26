/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { nxCopyAssetsPlugin } from '@nx/vite/plugins/nx-copy-assets.plugin';
import { createTestConfig } from '../../vitest.shared';

export default defineConfig(({ command }) => ({
    root: import.meta.dirname,
    cacheDir: '../../../node_modules/.vite/libs/mixins',
    plugins: [
        angular({
            tsconfig: `${import.meta.dirname}/${command === 'build' ? 'tsconfig.lib.json' : 'tsconfig.spec.json'}`,
        }),
        nxViteTsPaths(),
        nxCopyAssetsPlugin(['*.md']),
    ],
    build: {
        lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
        rolldownOptions: { external: [/^rxjs/] },
    },
    // Uncomment this if you are using workers.
    // worker: {
    //  plugins: [ nxViteTsPaths() ],
    // },
    test: createTestConfig('../../../coverage/libs/common/utils'),
}));
