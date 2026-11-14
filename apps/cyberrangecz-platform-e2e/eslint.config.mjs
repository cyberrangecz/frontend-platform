import baseConfig from '../../eslint.config.mjs';

export default [
    ...baseConfig,
    {
        files: ['**/*.ts'],
        rules: {
            // Playwright reads the fixtures a hook needs from its destructured first parameter, so an empty pattern asks for none.
            'no-empty-pattern': ['error', { allowObjectPatternsAsParameters: true }],
        },
    },
];
