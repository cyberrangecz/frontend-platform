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
const MERGED_TEST_TIMEOUT_MILLISECONDS = 900_000;
const LOGIN_URL = /\/login(\?|$)/;

test.describe('guard redirects', () => {
    test.use({ account: 'anonymous' });

    test('sends a signed-out visitor to the login page', async ({ page }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);

        for (const address of GUARDED_ADDRESSES) {
            await test.step(`sends a signed-out visitor from ${address} to the login page`, async () => {
                await page.goto(address);
                await expect
                    .soft(page, `address after visiting ${address}`)
                    .toHaveURL(LOGIN_URL, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
                await expect
                    .soft(page.getByRole('button', { name: 'Login with local Keycloak' }), 'provider button')
                    .toBeVisible();
            });
        }

        await test.step('sends a signed-out visitor from the root to the login page', async () => {
            await page.goto('/');
            await expect
                .soft(page, 'address after visiting the root')
                .toHaveURL(LOGIN_URL, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
        });

        await test.step('sends a signed-out visitor from a sub page of a guarded route to the login page', async () => {
            await page.goto('/linear-definition/create');
            await expect
                .soft(page, 'address after visiting a sub page of a guarded route')
                .toHaveURL(LOGIN_URL, { timeout: APPLICATION_START_TIMEOUT_MILLISECONDS });
        });
    });
});
