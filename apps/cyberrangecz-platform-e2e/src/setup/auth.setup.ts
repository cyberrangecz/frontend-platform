import { test as setup } from '@playwright/test';
import { ACCOUNT_KEYS, ACCOUNTS, type AccountKey } from '../support/accounts';
import { environment, originUrl } from '../support/environment';
import { signIn } from '../support/sign-in';
import { type Origin, readState, statePaths, writeState } from '../support/state-files';
import { trackLoadActivity } from '../support/ui/loading-window';

const credentials = readState<Record<string, string>>(
    statePaths.credentials,
    'the wipe and prepare run (nx run cyberrangecz-platform-e2e:wipe)',
);

const SIGN_INS: { account: AccountKey; origin: Origin }[] = [
    ...ACCOUNT_KEYS.map((account) => ({ account, origin: 'application' as const })),
    ...(environment.deployedOriginSpecs
        ? [{ account: 'userAdministrator' as const, origin: 'deployed' as const }]
        : []),
];

setup.describe.configure({ mode: 'parallel' });

for (const { account, origin } of SIGN_INS) {
    setup(`sign in ${ACCOUNTS[account].login} on the ${origin} origin`, async ({ browser }) => {
        const login = ACCOUNTS[account].login;
        const password = credentials[login];
        if (!password) {
            throw new Error(`${statePaths.credentials} holds no password for ${login}`);
        }
        const context = await browser.newContext({ ignoreHTTPSErrors: true });
        trackLoadActivity(context);
        try {
            const page = await context.newPage();
            await signIn(page, originUrl(origin), { login, password });
            writeState(statePaths.storageState(account, origin), await context.storageState());
        } finally {
            await context.close();
        }
    });
}
