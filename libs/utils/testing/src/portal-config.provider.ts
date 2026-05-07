import { Provider } from '@angular/core';
import { DeepPartial, PortalConfig } from '@crczp/utils';

/**
 * Production-like defaults used as the base for all test configurations.
 * Constructed via Zod schema to guarantee all required fields are present and valid.
 */
const BASE_TEST_CONFIG = PortalConfig.schema().parse({
    defaultPageSize: 10,
    roleMapping: {
        uagAdmin: 'ROLE_ADMIN',
        trainingDesigner: 'ROLE_DESIGNER',
        trainingOrganizer: 'ROLE_ORGANIZER',
        trainingTrainee: 'ROLE_TRAINEE',
        sandboxDesigner: 'ROLE_SANDBOX_DESIGNER',
        sandboxOrganizer: 'ROLE_SANDBOX_ORGANIZER',
    },
    polling: {
        pollingPeriodShort: 5_000,
        pollingPeriodLong: 30_000,
        retryCount: 3,
    },
    caching: {
        endpointCachingDisabled: false,
        endpointCacheTTL: 300,
        eventCacheTTL: 7 * 24 * 3_600,
        eventEntityCacheTTL: 300,
        eventCacheMaxStaleness: 30_000,
        eventCacheMaxSize: 524_288_000,
    },
    basePaths: {
        linearTraining: 'http://localhost/api',
        guacamole: 'http://localhost/api',
        mitre: 'http://localhost/api',
        userAndGroup: 'http://localhost/api',
        sandbox: 'http://localhost/api',
    },
    authConfig: {},
});

/**
 * Returns an Angular provider that supplies {@link PortalConfig} in TestBed.
 *
 * @param overrides Deep-partial overrides applied on top of {@link BASE_TEST_CONFIG}.
 *   Nested sections (caching, polling, roleMapping, basePaths, authConfig) are
 *   shallow-merged so callers only need to specify the fields that differ.
 *   Accepts out-of-range values (e.g. `caching.eventCacheTTL: 0`) intentionally
 *   used in tests to trigger immediate eviction without bypassing Zod at call sites.
 */
export function provideTestPortalConfig(
    overrides?: DeepPartial<typeof BASE_TEST_CONFIG>,
): Provider {
    const o = overrides ?? {};
    return {
        provide: PortalConfig,
        useValue: {
            ...BASE_TEST_CONFIG,
            ...o,
            caching: { ...BASE_TEST_CONFIG.caching, ...(o.caching ?? {}) },
            polling: { ...BASE_TEST_CONFIG.polling, ...(o.polling ?? {}) },
            roleMapping: { ...BASE_TEST_CONFIG.roleMapping, ...(o.roleMapping ?? {}) },
            basePaths: { ...BASE_TEST_CONFIG.basePaths, ...(o.basePaths ?? {}) },
            authConfig: { ...BASE_TEST_CONFIG.authConfig, ...(o.authConfig ?? {}) },
        },
    };
}
