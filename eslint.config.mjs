import nx from '@nx/eslint-plugin';

export default [
    {
        files: ['**/*.json'],
        // Override or add rules here
        rules: {},
        languageOptions: {
            parser: await import('jsonc-eslint-parser'),
        },
    },
    ...nx.configs['flat/base'],
    ...nx.configs['flat/typescript'],
    ...nx.configs['flat/javascript'],
    {
        ignores: [
            '**/dist',
            '**/vite.config.*.timestamp*',
            '**/vitest.config.*.timestamp*',
        ],
    },
    {
        files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx'],
        rules: {
            '@nx/enforce-module-boundaries': [
                'error',
                {
                    enforceBuildableLibDependency: true,
                    allow: ['^.*/eslint(\\.base)?\\.config\\.[cm]?js$'],
                    depConstraints: [
                        {
                            sourceTag: '*',
                            onlyDependOnLibsWithTags: ['*'],
                        },
                    ],
                },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },
    {
        files: [
            '**/*.ts',
            '**/*.tsx',
            '**/*.cts',
            '**/*.mts',
            '**/*.js',
            '**/*.jsx',
            '**/*.cjs',
            '**/*.mjs',
        ],
        // Override or add rules here
        rules: {},
    },
    {
        files: ['**/package.json', '**/executors.json'],
        rules: {
            '@nx/nx-plugin-checks': 'error',
        },
        languageOptions: {
            parser: await import('jsonc-eslint-parser'),
        },
    },
    {
        files: ['**/*.html'],
        languageOptions: {
            parser: await import('@angular-eslint/template-parser'),
        },
        rules: {
            '@angular-eslint/template/mouse-events-have-key-events': 'off',
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
        },
    },
    {
        files: ['**/*.ts'],
        rules: {
            '@angular-eslint/prefer-standalone': 'off',
        },
    },
];
