import { Page } from '@playwright/test';

export interface PlatformAccount {
    origin: string;
    username: string;
    password: string;
}

/**
 * Signs the account in through the identity provider form and waits until the platform has stored
 * the access token of the session.
 */
export async function signIn(page: Page, account: PlatformAccount): Promise<void> {
    await page.goto('/home');
    const keycloakButton = page.getByRole('button', { name: 'Login with local Keycloak' });
    if (await keycloakButton.isVisible().catch(() => false)) {
        await keycloakButton.click();
    }
    const usernameField = page.getByRole('textbox', { name: 'Username or email' });
    if (await usernameField.isVisible().catch(() => false)) {
        await usernameField.fill(account.username);
        await page.getByRole('textbox', { name: 'Password' }).fill(account.password);
        await page.getByRole('button', { name: 'Sign In' }).click();
    }
    await page.waitForURL(`${account.origin}/**`);
    await page.waitForFunction(() => localStorage.getItem('access_token') !== null);
}
