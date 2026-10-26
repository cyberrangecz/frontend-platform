import { type Browser, chromium } from '@playwright/test';
import { ACCOUNTS, type AccountKey } from './accounts';
import { RefreshTokenSource } from './api/token-source';
import { originUrl } from './environment';
import { signIn } from './sign-in';
import {
    type Origin,
    readState,
    saveStorageState,
    statePaths,
    type StorageStateObject,
    storedValue,
    withFileLock,
} from './state-files';
import { trackLoadActivity } from './ui/loading-window';

/**
 * Signs an account in through the application's login page in a fresh context of a browser,
 * with the password the wipe saved for it.
 *
 * @returns The context's storage state, holding the account's tokens and identity provider cookies.
 * @throws {Error} When the credentials state file holds no password for the account.
 */
export async function signInAccount(
    browser: Browser,
    account: AccountKey,
    origin: Origin,
): Promise<StorageStateObject> {
    const login = ACCOUNTS[account].login;
    const password = readState<Record<string, string>>(
        statePaths.credentials,
        'the wipe and prepare run (nx run cyberrangecz-platform-e2e:wipe)',
    )[login];
    if (!password) {
        throw new Error(`${statePaths.credentials} holds no password for ${login}`);
    }
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    trackLoadActivity(context);
    try {
        const page = await context.newPage();
        await signIn(page, originUrl(origin), { login, password });
        return await context.storageState();
    } finally {
        await context.close();
    }
}

/**
 * Signs an account in again in a browser of its own and saves the new storage state over the
 * account's file, so browser contexts and other workers start from the new session.
 *
 * @returns The refresh token of the new session.
 */
async function renewSession(account: AccountKey, origin: Origin): Promise<string> {
    const browser = await chromium.launch();
    try {
        const state = await signInAccount(browser, account, origin);
        const refreshToken = storedValue(state, 'refresh_token');
        if (!refreshToken) {
            throw new Error(`Signing ${ACCOUNTS[account].login} in again left no refresh_token`);
        }
        const path = statePaths.storageState(account, origin);
        withFileLock(path, () => saveStorageState(path, state));
        return refreshToken;
    } finally {
        await browser.close();
    }
}

const sourcesByStatePath = new Map<string, RefreshTokenSource>();

/**
 * The worker's one token source for an account at an origin, which signs the account in again
 * whenever the identity provider has ended its session.
 */
export function tokenSourceFor(account: AccountKey, origin: Origin = 'application'): RefreshTokenSource {
    const path = statePaths.storageState(account, origin);
    let source = sourcesByStatePath.get(path);
    if (!source) {
        source = RefreshTokenSource.fromStorageState(path, () => renewSession(account, origin));
        sourcesByStatePath.set(path, source);
    }
    return source;
}
