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

test.describe('login', () => {
    test.describe('signed out', () => {
        test.use({ account: 'anonymous' });

        test('shows the login card with the provider button', async ({ page, checkpoint }) => {
            const login = new LoginPage(page);
            await login.open();
            await expect(login.heading).toBeVisible();
            await expect(login.providerButton).toBeVisible();
            await expect(login.providerButton).toBeEnabled();
            await expect(page.getByText('On your first login you will be registered')).toBeVisible();
            await checkpoint(page, 'login page');
        });

        test('shows the access consent notice with a contact address', async ({ page }) => {
            const login = new LoginPage(page);
            await login.open();
            await expect(login.consentCard).toContainText('personal data');
            await expect(login.consentAddress).toHaveAttribute('href', 'mailto:info@cyberrange.cz');
        });

        test('shows no navigation entries and no user name while signed out', async ({ page }) => {
            const login = new LoginPage(page);
            await login.open();
            await expect(login.providerButton).toBeVisible();
            await expect(toolbarUserName(page)).toHaveCount(0);
            await expect(navigation(page).getByRole('link', { name: 'Run' })).toHaveCount(0);
        });

        test('redirects to the identity provider when the provider button is clicked', async ({
            page,
            checkpoint,
        }) => {
            const login = new LoginPage(page);
            await login.open();
            await login.providerButton.click();
            await expect(page).toHaveURL(IDENTITY_PROVIDER_URL, { timeout: 30_000 });
            await expect(page.getByLabel(/username or email/i)).toBeVisible();
            await expect(page.getByLabel(/^password$/i)).toBeVisible();
            await checkpoint(page, 'identity provider form');
        });

        test('the identity provider request names the application as its return address', async ({
            page,
        }) => {
            const login = new LoginPage(page);
            await login.open();
            await login.providerButton.click();
            await expect(page).toHaveURL(IDENTITY_PROVIDER_URL, { timeout: 30_000 });
            const query = new URL(page.url()).searchParams;
            expect(query.get('client_id')).toBe('CRCZP-Client');
            expect(query.get('response_type')).toBe('code');
            expect(query.get('redirect_uri')).toContain('http');
        });

        test('keeps the requested guarded address in the login address', async ({ page }) => {
            await page.goto(AGENDAS.pool.path);
            await expect(page).toHaveURL(/\/login\?/);
            expect(new URL(page.url()).searchParams.get(NAVIGATE_AFTER_LOGIN)).toBe(AGENDAS.pool.path);
        });

        test('keeps the query of the requested guarded address', async ({ page }) => {
            await page.goto(`${AGENDAS.pool.path}?probe=1`);
            await expect(page).toHaveURL(/\/login\?/);
            expect(new URL(page.url()).searchParams.get(NAVIGATE_AFTER_LOGIN)).toBe(
                `${AGENDAS.pool.path}?probe=1`,
            );
        });
    });

    test.describe('signed in', () => {
        test('sends a signed-in account away from the login page', async ({ openAs }) => {
            const page = await openSignedInPage(openAs);
            await page.goto('/login');
            await expect(page).not.toHaveURL(/\/login/);
        });

        test('follows the requested address carried by the login address after sign-in', async ({ openAs }) => {
            const page = await openSignedInPage(openAs);
            await page.goto(`/login?${NAVIGATE_AFTER_LOGIN}=${encodeURIComponent(AGENDAS.trainingInstance.path)}`);
            await expect(page).toHaveURL(new RegExp(`${AGENDAS.trainingInstance.path}$`));
        });
    });
});
