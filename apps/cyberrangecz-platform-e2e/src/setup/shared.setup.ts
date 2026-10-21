import { ACCOUNT_KEYS, ACCOUNTS, type AccountKey } from '../support/accounts';
import { test as setup } from '../support/fixtures';
import { createPoolOnDefinition } from '../support/pages/pool/pool-data';
import { createTrainingInstance } from '../support/pages/training-instance/instance-data';
import { sharedTrainingImport } from '../support/scenario/shared-training-loader';
import { type SharedFixture, writeSharedFixture } from '../support/shared-fixture';
import { DAY_MILLISECONDS, fromNow } from '../support/time';

const SANDBOX_DEFINITION = {
    url: 'https://github.com/cyberrangecz/library-demo-training.git',
    rev: 'master',
};
const POOL_MAX_SIZE = 3;
const INSTANCE_START_DELAY_MILLISECONDS = 60_000;
const INSTANCE_DURATION_MILLISECONDS = 7 * DAY_MILLISECONDS;

interface SandboxDefinitionResponse {
    id: number;
    url: string;
    rev: string;
}

function runStamp(now: Date): string {
    const twoDigits = (value: number) => String(value).padStart(2, '0');
    return `${twoDigits(now.getMonth() + 1)}${twoDigits(now.getDate())}-${twoDigits(now.getHours())}${twoDigits(now.getMinutes())}`;
}

setup('create the shared sandbox, pool, training definition and instance', async ({ apiAs }) => {
    const stamp = runStamp(new Date());

    const userIds = await setup.step('resolve the user ids of the accounts', async () => {
        const users = await apiAs('userAdministrator').userAndGroup.getAll<{
            id: number;
            sub: string;
        }>('/users');
        return Object.fromEntries(
            ACCOUNT_KEYS.map((account) => {
                const user = users.find((candidate) => candidate.sub === ACCOUNTS[account].subject);
                if (!user) {
                    throw new Error(`No user has the subject ${ACCOUNTS[account].subject}`);
                }
                return [account, user.id];
            }),
        ) as Record<AccountKey, number>;
    });

    const sandboxDefinition = await setup.step('reuse or create the sandbox definition', async () => {
        const sandbox = apiAs('sandboxDesigner').sandbox;
        const existing = (await sandbox.getAll<SandboxDefinitionResponse>('/definitions')).find(
            (definition) =>
                definition.url === SANDBOX_DEFINITION.url &&
                definition.rev === SANDBOX_DEFINITION.rev,
        );
        return (
            existing ??
            (await sandbox.post<SandboxDefinitionResponse>('/definitions', SANDBOX_DEFINITION))
        );
    });

    const pool = await setup.step('create the pool', () =>
        createPoolOnDefinition(apiAs('sandboxOrganizer').sandbox, sandboxDefinition.id, {
            maxSize: POOL_MAX_SIZE,
            comment: `e2e-shared-pool-${stamp}`,
        }),
    );

    const trainingDefinition = await setup.step('import and release the training definition', async () => {
        const training = apiAs('trainingDesigner').training;
        const imported = await training.post<{ id: number; title: string }>(
            '/imports/training-definitions',
            sharedTrainingImport(`e2e-shared-training-${stamp}`),
        );
        await training.put(`/training-definitions/${imported.id}/states/RELEASED`);
        return imported;
    });

    const trainingInstance = await setup.step('create the training instance', () => {
        const startTime = fromNow(INSTANCE_START_DELAY_MILLISECONDS);
        return createTrainingInstance(apiAs('trainingOrganizer').training, {
            title: `e2e-shared-instance-${stamp}`,
            startTime,
            endTime: new Date(startTime.getTime() + INSTANCE_DURATION_MILLISECONDS),
            accessTokenPrefix: `e2e${stamp.replace('-', '')}`,
            trainingDefinitionId: trainingDefinition.id,
            poolId: pool.id,
        });
    });

    const fixture: SharedFixture = {
        runStamp: stamp,
        userIds,
        sandboxDefinition: {
            id: sandboxDefinition.id,
            url: sandboxDefinition.url,
            rev: sandboxDefinition.rev,
        },
        pool: { id: pool.id, maxSize: POOL_MAX_SIZE },
        trainingDefinition: { id: trainingDefinition.id, title: trainingDefinition.title },
        trainingInstance: {
            id: trainingInstance.id,
            title: trainingInstance.title,
            accessToken: trainingInstance.access_token,
        },
    };
    writeSharedFixture(fixture);
});
