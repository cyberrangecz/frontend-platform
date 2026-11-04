import { Page } from '@playwright/test';

export interface PlatformAccount {
    origin: string;
    username: string;
    password: string;
}

/**
 * Signs the account in through the identity provider form and waits until the platform has left the
 * sign-in callback for its post-login page and has stored the access token of the session. A page
 * that already holds an access token is left signed in as it is.
 */
export async function signIn(page: Page, account: PlatformAccount): Promise<void> {
    await page.goto('/home');
    if (await page.evaluate(() => localStorage.getItem('access_token') !== null)) {
        return;
    }
    const keycloakButton = page.getByRole('button', { name: 'Login with local Keycloak' });
    const usernameField = page.getByRole('textbox', { name: 'Username or email' });
    await keycloakButton.or(usernameField).first().waitFor();
    if (await keycloakButton.isVisible()) {
        await keycloakButton.click();
    }
    await usernameField.fill(account.username);
    await page.getByRole('textbox', { name: 'Password' }).fill(account.password);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(
        (url) => url.origin === account.origin && url.pathname !== '/' && !url.pathname.startsWith('/keycloak')
    );
    await page.waitForFunction(() => localStorage.getItem('access_token') !== null);
}
