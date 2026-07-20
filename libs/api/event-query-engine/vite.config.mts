/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import { createTestConfig } from '../../../vitest.shared';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../../node_modules/.vite/libs/api/event-query-engine',
    plugins: [angular(), nxViteTsPaths()],
    test: createTestConfig('../../../coverage/libs/api/event-query-engine', {
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    }),
}));
