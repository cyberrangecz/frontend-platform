import { accountFor } from '../support/accounts';
import { RefreshTokenSource } from '../support/api/token-source';
import { expect, test } from '../support/fixtures';
import { statePaths } from '../support/state-files';
import { logoutMenuItem, openUserMenu, userMenuButton, waitForPageReady } from '../support/ui';

test.use({ account: 'trainee' });

test.describe('logout', () => {
    test.describe.configure({ mode: 'serial' });

    test('ends the trainee session through the user menu', async ({ page, checkpoint }) => {
        await page.goto('/run');
        await waitForPageReady(page);
        await openUserMenu(page);
        await logoutMenuItem(page).click();

        await expect(page).toHaveURL(/\/login/);
        await expect(page.getByRole('button', { name: 'Login with local Keycloak' })).toBeVisible();
        await expect(userMenuButton(page)).toHaveCount(0);
        expect(await page.evaluate(() => localStorage.getItem('access_token'))).toBeNull();
        expect(await page.evaluate(() => localStorage.getItem('refresh_token'))).toBeNull();
        await checkpoint(page, 'signed out');

        await page.goto('/run');
        await expect(page).toHaveURL(/\/login/);
        await expect(userMenuButton(page)).toHaveCount(0);
    });

    test('invalidates the refresh token of the ended session', async ({ browserKey }) => {
        const tokens = RefreshTokenSource.fromStorageState(
            statePaths.storageState(accountFor('trainee', browserKey)),
        );
        await expect(tokens.accessToken()).rejects.toThrow(/Token refresh answered 4\d\d/);
    });
});
