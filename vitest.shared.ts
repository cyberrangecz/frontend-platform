import type { InlineConfig } from 'vitest/node';

export function createTestConfig(
    reportsDirectory: string,
    overrides: Partial<InlineConfig> = {},
): InlineConfig {
    return {
        watch: false,
        globals: true,
        environment: 'jsdom',
        include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        setupFiles: ['src/test-setup.ts'],
        reporters: ['default'],
        server: {
            deps: {
                inline: ['@sentinel/common', '@sentinel/common/pagination'],
            },
        },
        coverage: {
            reportsDirectory,
            provider: 'v8',
        },
        ...overrides,
    };
}
