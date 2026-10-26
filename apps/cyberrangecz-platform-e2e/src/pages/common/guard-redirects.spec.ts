import { expect, test } from '../../support/fixtures';
import { ALL_AGENDAS, AGENDAS } from '../../support/pages/common/role-agendas';

const GUARDED_ADDRESSES = [
    ...ALL_AGENDAS.map((key) => AGENDAS[key].path),
    '/mitre-techniques',
    '/notifications',
    '/home',
    '/console/sandbox-instance/1/console/1',
];

const APPLICATION_START_TIMEOUT_MILLISECONDS = 60_000;

test.describe('guard redirects', () => {
    test.use({ account: 'anonymous' });

    for (const address of GUARDED_ADDRESSES) {
        test(`sends a signed-out visitor from ${address} to the login page`, async ({ page }) => {
            await page.goto(address);
            await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
            await expect(page.getByRole('button', { name: 'Login with local Keycloak' })).toBeVisible();
        });
    }

    test('sends a signed-out visitor from the root to the login page', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
    });

    test('sends a signed-out visitor from a sub page of a guarded route to the login page', async ({
        page,
    }) => {
        await page.goto('/linear-definition/create');
        await expect(page).toHaveURL(/\/login(\?|$)/, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
    });
});
