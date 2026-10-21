import { environment } from '../support/environment';
import type { Credentials } from '../support/sign-in';
import { readState, statePaths } from '../support/state-files';

function storedPassword(login: string): string | undefined {
    try {
        return readState<Record<string, string>>(statePaths.credentials, 'the wipe')[login];
    } catch {
        return undefined;
    }
}

/**
 * The administrator account the wipe signs in with by itself: the configured login with its
 * password from `E2E_ADMIN_PASSWORD`, else from the credentials state file. It is undefined when
 * no login is configured, or when no password is available outside CI, where a person signs in
 * by hand.
 *
 * @throws {Error} When a login is configured, no password is available and `CI` is set.
 */
export function adminCredentials(): Credentials | undefined {
    const login = environment.adminLogin;
    if (login === undefined) {
        return undefined;
    }
    const password = environment.adminPassword ?? storedPassword(login);
    if (password !== undefined) {
        return { login, password };
    }
    if (process.env['CI']) {
        throw new Error('E2E_ADMIN_LOGIN is set but no password is available; set E2E_ADMIN_PASSWORD');
    }
    return undefined;
}
