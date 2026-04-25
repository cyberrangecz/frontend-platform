import { Z } from 'zod-class';
import { z } from 'zod';
import { sentinelAuthConfigSchema } from './sentinel-auth-config.zod';

function removeTrailingSlash(str: string | undefined): string {
    return !str ? '':  str.endsWith('/') ? str.slice(0, -1) : str;
}

export class RoleMapping extends Z.class({
    uagAdmin: z.string().nonempty(),
    trainingDesigner: z.string().nonempty(),
    trainingOrganizer: z.string().nonempty(),
    trainingTrainee: z.string().nonempty(),
    sandboxDesigner: z.string().nonempty(),
    sandboxOrganizer: z.string().nonempty(),
}) {}

export class PortalConfig extends Z.class({
    version: z.string().nullish().describe('Optional version string'),

    enableLocalMode: z
        .boolean()
        .nullish()
        .describe('Enable local mode if true'),

    defaultPageSize: z
        .number({ required_error: 'Default page size field is required' })
        .gt(0, 'Page size must be greater than 0'),
    roleMapping: RoleMapping.schema(),

    polling: z.object({
        pollingPeriodShort: z
            .number({
                required_error: 'Short polling period field is required',
            })
            .gt(0, 'Polling period short must be greater than 0'),

        pollingPeriodLong: z
            .number({ required_error: 'Long polling period field is required' })
            .gt(0, 'Polling period long must be greater than 0'),

        retryCount: z
            .number({ required_error: 'Retry count field is required' })
            .int('Retry count must be an integer')
            .nonnegative('Retry count must be a non-negative integer'),
    }),

    caching: z.object({
        endpointCachingDisabled: z
            .boolean()
            .nullish()
            .describe('Disables caching of API responses if true'),
        endpointCacheTTL: z
            .number({ required_error: 'Cache TTL field is required' })
            .gt(0, 'Cache TTL must be greater than 0')
            .describe('TTL for cached API responses, used for cache eviction'),
        eventCacheTTL: z
            .number({ required_error: 'Event cache TTL field is required' })
            .gt(0, 'Event cache TTL must be greater than 0')
            .describe('TTL for cached event data, used for event query engine cache eviction'),
        eventEntityCacheTTL: z
            .number({
                required_error: 'Event entity cache TTL field is required',
            })
            .gt(0, 'Event entity cache TTL must be greater than 0')
            .describe('TTL for cached entities related to events, such as users and training definitions'),
        eventCacheMaxStaleness: z
            .number({
                required_error: 'Event cache max staleness field is required',
            })
            .gt(0, 'Event cache max staleness must be greater than 0')
            .describe('Maxmimum milliseconds after which cached event data is considered stale and triggers a synchronization on query'),
    }),

    basePaths: z.object({
        linearTraining: z
            .string({ required_error: 'Linear training API path is required' })
            .nonempty('No linear training api path provided')
            .transform(removeTrailingSlash),

        guacamole: z
            .string({ required_error: 'Guacamole path is required' })
            .nonempty('No guacamole path provided')
            .transform(removeTrailingSlash),

        mitre: z
            .string({ required_error: 'Mitre API path is required' })
            .nonempty('No mitre api path provided')
            .transform(removeTrailingSlash),

        userAndGroup: z
            .string({ required_error: 'User and group API path is required' })
            .nonempty('No user and group api path provided')
            .transform(removeTrailingSlash),

        sandbox: z
            .string({ required_error: 'Sandbox API path is required' })
            .nonempty('No sandbox api path provided')
            .transform(removeTrailingSlash),
    }),

    authConfig: sentinelAuthConfigSchema.describe(
        'Sentinel authentication config',
    ),
}) {}
