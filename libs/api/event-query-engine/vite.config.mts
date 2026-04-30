/// <reference types='vitest' />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

export default defineConfig(() => ({
    root: __dirname,
    cacheDir: '../../../node_modules/.vite/libs/api/event-query-engine',
    plugins: [angular(), nxViteTsPaths()],
    optimizeDeps: {
        exclude: ['@electric-sql/pglite'],
    },
    ssr: {
        external: ['@electric-sql/pglite'],
    },
    test: {
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        setupFiles: ['src/test-setup.ts'],
        reporters: ['default'],
        coverage: {
            reportsDirectory: '../../../coverage/libs/api/event-query-engine',
            provider: 'v8' as const,
        },
    },
}));
