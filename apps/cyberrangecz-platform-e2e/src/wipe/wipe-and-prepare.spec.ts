import { expect, test } from '@playwright/test';
import { createApi } from '../support/api/api-client';
import { RefreshTokenSource } from '../support/api/token-source';
import { environment } from '../support/environment';
import { signIn, waitForManualSignIn } from '../support/sign-in';
import { adminCredentials } from './admin-credentials';
import { AccountPreparation } from './account-preparation';
import { DevelWipe } from './devel-wipe';
import { LeftoverReport } from './leftover-report';
import { removePreviousRunOutput } from './previous-run-output';

const MINUTE = 60_000;
const MANUAL_SIGN_IN_TIMEOUT = 10 * MINUTE;
const SANDBOX_REMOVAL_TIMEOUT = 40 * MINUTE;

test('wipe devel and prepare the e2e accounts', async ({ page }) => {
    test.setTimeout(MANUAL_SIGN_IN_TIMEOUT + SANDBOX_REMOVAL_TIMEOUT + 20 * MINUTE);

    const credentials = adminCredentials();
    if (credentials) {
        await test.step('sign the administrator in', () =>
            signIn(page, environment.applicationOrigin, credentials),
        );
    } else {
        await test.step('wait for the administrator to sign in', () =>
            waitForManualSignIn(page, environment.applicationOrigin, MANUAL_SIGN_IN_TIMEOUT),
        );
    }
    const refreshToken = await page.evaluate(() => localStorage.getItem('refresh_token'));
    if (!refreshToken) {
        throw new Error('The signed-in application holds no refresh_token');
    }
    const api = createApi(new RefreshTokenSource(refreshToken));
    const report = new LeftoverReport();
    const wipe = new DevelWipe(api, report);
    const preparation = new AccountPreparation(api, report);

    await test.step('0 clean the output of previous suite runs', removePreviousRunOutput);
    await test.step('1 delete training runs', () => wipe.deleteTrainingRuns());
    await test.step('2 remove sandboxes', () => wipe.removeSandboxes(SANDBOX_REMOVAL_TIMEOUT));
    await test.step('3 delete training instances', () => wipe.deleteTrainingInstances());
    await test.step('4 delete training definitions', () => wipe.deleteTrainingDefinitions());
    await test.step('5 delete pools', () => wipe.deletePools());
    await test.step('6 delete sandbox definitions', () => wipe.deleteSandboxDefinitions());
    await test.step('7 delete groups', () => wipe.deleteGroups());
    await test.step('8 register filler sandbox definitions', () => wipe.registerFillerSandboxDefinitions());
    await test.step('9 prepare the e2e accounts', async () => {
        await preparation.pullCredentials();
        const userIds = await preparation.resolveUserIds();
        await preparation.removeFromKeptGroups(userIds);
        await preparation.createRoleGroups(userIds);
    });

    await test.info().attach('leftovers', {
        body: JSON.stringify(report.leftovers, null, 2),
        contentType: 'application/json',
    });
    expect(report.leftovers, 'entities left in place').toEqual([]);
});
