/// <reference types='vitest' />
import {defineConfig} from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import {nxViteTsPaths} from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import {nxCopyAssetsPlugin} from '@nx/vite/plugins/nx-copy-assets.plugin';
import { createTestConfig } from '../../../vitest.shared';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../../node_modules/.vite/libs/api/opensearch-query-builder',
    plugins: [angular(), nxViteTsPaths(), nxCopyAssetsPlugin(['*.md'])],
    test: createTestConfig('../../../coverage/libs/api/opensearch-query-builder'),
}));
