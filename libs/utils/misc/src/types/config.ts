import { Z } from 'zod-class';
import { z } from 'zod';
import { sentinelAuthConfigSchema } from './sentinel-auth-config.zod';

function removeTrailingSlash(str: string) {
    return str.endsWith('/') ? str.slice(0, -1) : str;
}

export class RoleMapping extends Z.class({
    uagAdmin: z.string().nonempty(),
    trainingDesigner: z.string().nonempty(),
    trainingOrganizer: z.string().nonempty(),
    adaptiveTrainingDesigner: z.string().nonempty(),
    adaptiveTrainingOrganizer: z.string().nonempty(),
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

    basePaths: z.object({
        linearTraining: z
            .string({ required_error: 'Linear training API path is required' })
            .nonempty('No linear training api path provided')
            .transform(removeTrailingSlash),

        adaptiveTraining: z
            .string({
                required_error: 'Adaptive training API path is required',
            })
            .nonempty('No adaptive training api path provided')
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
