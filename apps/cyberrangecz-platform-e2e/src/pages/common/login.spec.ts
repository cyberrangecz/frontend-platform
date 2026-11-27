import type { Page } from '@playwright/test';
import { expect, test } from '../../support/fixtures';
import { navigation, toolbarUserName, waitForPageReady } from '../../support/ui';
import { LoginPage } from '../../support/pages/common/login.page';
import { AGENDAS } from '../../support/pages/common/role-agendas';

const IDENTITY_PROVIDER_URL = /\/realms\/CRCZP\//;
const NAVIGATE_AFTER_LOGIN = 'sentinelAuthNavigateAfterLogin';

/**
 * Opens a page signed in as the training organizer from a freshly refreshed storage state and
 * confirms the stored access token is still valid before the page is used.
 */
async function openSignedInPage(openAs: (role: 'trainingOrganizer') => Promise<Page>): Promise<Page> {
    const page = await openAs('trainingOrganizer');
    await page.goto('/home');
    await waitForPageReady(page);
    const expiresAt = await page.evaluate(() => Number(localStorage.getItem('expires_at')));
    expect(expiresAt, 'access token expiry of the signed-in session').toBeGreaterThan(Date.now());
    return page;
}

const MERGED_TEST_TIMEOUT_MILLISECONDS = 300_000;

test.describe('login', () => {
    test.describe('signed out', () => {
        test.use({ account: 'anonymous' });

        test('login page', async ({ page, checkpoint }) => {
            test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
            const login = new LoginPage(page);
            await login.open();

            await test.step('shows the login card with the provider button', async () => {
                await expect.soft(login.heading, 'login card heading').toBeVisible();
                await expect.soft(login.providerButton, 'provider button').toBeVisible();
                await expect.soft(login.providerButton, 'provider button is enabled').toBeEnabled();
                await expect
                    .soft(page.getByText('On your first login you will be registered'), 'registration notice')
                    .toBeVisible();
                await checkpoint(page, 'login page');
            });

            await test.step('shows the access consent notice with a contact address', async () => {
                await expect.soft(login.consentCard, 'consent notice').toContainText('personal data');
                await expect
                    .soft(login.consentAddress, 'contact address of the consent notice')
                    .toHaveAttribute('href', 'mailto:info@cyberrange.cz');
            });

            await test.step('shows no navigation entries and no user name while signed out', async () => {
                await expect.soft(login.providerButton, 'provider button').toBeVisible();
                await expect.soft(toolbarUserName(page), 'no user name while signed out').toHaveCount(0);
                await expect
                    .soft(navigation(page).getByRole('link', { name: 'Run' }), 'no Run entry while signed out')
                    .toHaveCount(0);
            });

            await test.step('keeps the requested guarded address in the login address', async () => {
                await page.goto(AGENDAS.pool.path);
                await expect.soft(page, 'login address').toHaveURL(/\/login\?/);
                expect
                    .soft(new URL(page.url()).searchParams.get(NAVIGATE_AFTER_LOGIN), 'requested address in the login address')
                    .toBe(AGENDAS.pool.path);
            });

            await test.step('keeps the query of the requested guarded address', async () => {
                await page.goto(`${AGENDAS.pool.path}?probe=1`);
                await expect.soft(page, 'login address').toHaveURL(/\/login\?/);
                expect
                    .soft(new URL(page.url()).searchParams.get(NAVIGATE_AFTER_LOGIN), 'requested address with its query')
                    .toBe(`${AGENDAS.pool.path}?probe=1`);
            });

            await test.step('redirects to the identity provider when the provider button is clicked', async () => {
                await login.open();
                await login.providerButton.click();
                await expect
                    .soft(page, 'address of the identity provider')
                    .toHaveURL(IDENTITY_PROVIDER_URL, { timeout: 30_000 });
                await expect.soft(page.getByLabel(/username or email/i), 'username field').toBeVisible();
                await expect
                    .soft(page.getByRole('textbox', { name: 'Password', exact: true }), 'password field')
                    .toBeVisible();
                await checkpoint(page, 'identity provider form');
            });

            await test.step('the identity provider request names the application as its return address', async () => {
                const query = new URL(page.url()).searchParams;
                expect.soft(query.get('client_id'), 'client_id of the request').toBe('CRCZP-Client');
                expect.soft(query.get('response_type'), 'response_type of the request').toBe('code');
                expect.soft(query.get('redirect_uri'), 'redirect_uri of the request').toContain('http');
            });
        });
    });

    test('signed in', async ({ openAs }) => {
        test.setTimeout(MERGED_TEST_TIMEOUT_MILLISECONDS);
        const page = await openSignedInPage(openAs);

        await test.step('sends a signed-in account away from the login page', async () => {
            await page.goto('/login');
            await expect.soft(page, 'address after visiting the login page').not.toHaveURL(/\/login/);
        });

        await test.step('follows the requested address carried by the login address after sign-in', async () => {
            await page.goto(`/login?${NAVIGATE_AFTER_LOGIN}=${encodeURIComponent(AGENDAS.trainingInstance.path)}`);
            await expect
                .soft(page, 'address after following the requested address')
                .toHaveURL(new RegExp(`${AGENDAS.trainingInstance.path}$`));
        });
    });
});
