import { Z } from 'zod-class';
import { z } from 'zod';
import { sentinelAuthConfigSchema } from './sentinel-auth-config.zod';
import {
    BYTE_SIZE_UNITS_LEGEND,
    DURATION_UNITS_LEGEND,
    isByteSizeAtLeast,
    isDurationAtLeast,
    isNumberWithByteSizeUnit,
    isNumberWithDurationUnit,
    parseByteSizeToBytes,
    parseDurationToMs,
} from './unit-values';

const POLLING_MINIMUM_DURATION = '300ms';
const CACHE_MINIMUM_DURATION = '3s';
const CACHE_MINIMUM_SIZE = '30MB';

function removeTrailingSlash(str: string | undefined): string {
    return !str ? '' : str.endsWith('/') ? str.slice(0, -1) : str;
}

/**
 * Builds a schema that accepts a human-readable duration string and yields the equivalent
 * milliseconds as a number.
 *
 * @param requiredError Message emitted when the field is absent.
 * @param label Field name used to prefix the malformed-value message.
 * @param minimumDuration Inclusive lower bound as a duration string; values below it are rejected.
 * @returns A schema validating a duration string and transforming it to milliseconds.
 */
function durationMs(
    requiredError: string,
    label: string,
    minimumDuration: string,
) {
    return z
        .string({ required_error: requiredError })
        .refine(isNumberWithDurationUnit, {
            message: `${label} must be a duration. ${DURATION_UNITS_LEGEND}`,
        })
        .refine(isDurationAtLeast(minimumDuration), {
            message: `${label} must be at least ${minimumDuration}.`,
        })
        .transform(parseDurationToMs);
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

    polling: z
        .object({
            pollingPeriodShort: durationMs(
                'Short polling period field is required',
                'Short polling period',
                POLLING_MINIMUM_DURATION,
            ).describe('Short polling interval, in milliseconds'),

            pollingPeriodLong: durationMs(
                'Long polling period field is required',
                'Long polling period',
                POLLING_MINIMUM_DURATION,
            ).describe('Long polling interval, in milliseconds'),

            retryCount: z
                .number({ required_error: 'Retry count field is required' })
                .int('Retry count must be an integer')
                .nonnegative('Retry count must be a non-negative integer'),
        })
        .transform(
            ({ pollingPeriodShort, pollingPeriodLong, retryCount }) => ({
                pollingPeriodShortMs: pollingPeriodShort,
                pollingPeriodLongMs: pollingPeriodLong,
                retryCount,
            }),
        ),

    caching: z
        .object({
            eventCacheTtl: durationMs(
                'Event cache TTL field is required',
                'Event cache TTL',
                CACHE_MINIMUM_DURATION,
            ).describe(
                'TTL for cached event data in milliseconds, used for event query engine cache eviction',
            ),
            entityCacheTtl: durationMs(
                'Entity cache TTL field is required',
                'Entity cache TTL',
                CACHE_MINIMUM_DURATION,
            ).describe(
                'TTL in milliseconds for cached entities related to events, such as users and training definitions',
            ),
            eventCacheMaxSize: z
                .string()
                .refine(isNumberWithByteSizeUnit, {
                    message: `Event cache max size must be a byte size. ${BYTE_SIZE_UNITS_LEGEND}`,
                })
                .refine(isByteSizeAtLeast(CACHE_MINIMUM_SIZE), {
                    message: `Event cache max size must be at least ${CACHE_MINIMUM_SIZE}.`,
                })
                .optional()
                .default('500MB')
                .transform(parseByteSizeToBytes)
                .describe(
                    'Maximum size in bytes for the event cache database. When exceeded at bootstrap, least-recently-synced instances are dropped until the limit is satisfied. Defaults to 500 MB.',
                ),
        })
        .transform(({ eventCacheTtl, entityCacheTtl, eventCacheMaxSize }) => ({
            eventCacheTtlMs: eventCacheTtl,
            entityCacheTtlMs: entityCacheTtl,
            eventCacheMaxSizeBytes: eventCacheMaxSize,
        })),

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
