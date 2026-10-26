import type { Page } from '@playwright/test';

const IDENTITY_PROVIDER_URL = /\/realms\//;
const SIGN_IN_TIMEOUT_MILLISECONDS = 60_000;

export interface Credentials {
    login: string;
    password: string;
}

function isSignedInUrl(url: URL, origin: string): boolean {
    return url.origin === origin && !url.pathname.startsWith('/login');
}

async function waitForApplicationTokens(page: Page, timeout: number): Promise<void> {
    await page.waitForFunction(() => localStorage.getItem('refresh_token') !== null, null, {
        timeout,
    });
}

/**
 * Signs a fresh browser context in through the application's login page and the Keycloak form,
 * resolving once the application holds its tokens.
 */
export async function signIn(page: Page, origin: string, credentials: Credentials): Promise<void> {
    await page.goto(`${origin}/login`);
    await page.getByRole('button', { name: /keycloak/i }).click();
    await page.waitForURL(IDENTITY_PROVIDER_URL, { timeout: SIGN_IN_TIMEOUT_MILLISECONDS });
    await page.getByLabel(/username or email/i).fill(credentials.login);
    await page.getByLabel(/^password$/i).fill(credentials.password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((url) => isSignedInUrl(url, origin), {
        timeout: SIGN_IN_TIMEOUT_MILLISECONDS,
    });
    await waitForApplicationTokens(page, SIGN_IN_TIMEOUT_MILLISECONDS);
}

/**
 * Opens the application's login page and waits for a person to sign in by hand, resolving once
 * the application holds its tokens.
 */
export async function waitForManualSignIn(
    page: Page,
    origin: string,
    timeout: number,
): Promise<void> {
    await page.goto(`${origin}/login`);
    await page.waitForURL((url) => isSignedInUrl(url, origin), { timeout });
    await waitForApplicationTokens(page, timeout);
}
