import angularEslint from '@angular-eslint/eslint-plugin';
import angularTemplateEslint from '@angular-eslint/eslint-plugin-template';
import nx from '@nx/eslint-plugin';
import rdlabo from '@rdlabo/eslint-plugin-rules';

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
            '@typescript-eslint/no-namespace': 'off',
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
        plugins: {
            '@angular-eslint': angularEslint,
            '@angular-eslint/template': angularTemplateEslint,
            '@rdlabo/rules': rdlabo,
        },
        languageOptions: {
            parser: await import('@angular-eslint/template-parser'),
            parserOptions: {
                projectService: true,
                allowAutomaticSingleRunInference: true,
            },
        },
        rules: {
            '@angular-eslint/template/mouse-events-have-key-events': 'off',
            '@angular-eslint/template/click-events-have-key-events': 'off',
            '@angular-eslint/template/interactive-supports-focus': 'off',
            '@rdlabo/rules/signal-use-as-signal-template': 'error',
        },
    },
    {
        files: ['**/*.ts'],
        plugins: {
            '@angular-eslint': angularEslint,
            '@rdlabo/rules': rdlabo,
        },
        languageOptions: {
            parserOptions: {
                projectService: true,
                allowAutomaticSingleRunInference: true,
            },
        },
        rules: {
            '@angular-eslint/prefer-standalone': 'off',
            '@angular-eslint/no-uncalled-signals': 'error',
            '@rdlabo/rules/signal-use-as-signal': 'error',
        },
    },
];
