import { test as setup } from '@playwright/test';
import { signInAccount } from '../support/account-sessions';
import { ACCOUNT_KEYS, ACCOUNTS, type AccountKey } from '../support/accounts';
import { environment } from '../support/environment';
import { type Origin, statePaths, writeState } from '../support/state-files';

const SIGN_INS: { account: AccountKey; origin: Origin }[] = [
    ...ACCOUNT_KEYS.map((account) => ({ account, origin: 'application' as const })),
    ...(environment.deployedOriginSpecs
        ? [{ account: 'userAdministrator' as const, origin: 'deployed' as const }]
        : []),
];

setup.describe.configure({ mode: 'parallel' });

for (const { account, origin } of SIGN_INS) {
    setup(`sign in ${ACCOUNTS[account].login} on the ${origin} origin`, async ({ browser }) => {
        writeState(statePaths.storageState(account, origin), await signInAccount(browser, account, origin));
    });
}
