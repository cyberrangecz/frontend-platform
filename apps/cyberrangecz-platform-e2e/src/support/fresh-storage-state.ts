import type { AccountKey } from './accounts';
import { tokenSourceFor } from './account-sessions';
import { expiresLater } from './api/token-source';
import { type Origin, readStorageState, statePaths, type StorageStateObject, storedValue } from './state-files';
import { withTokens } from './storage-state-tokens';

function storedExpiry(state: StorageStateObject, name: string): number | undefined {
    const value = storedValue(state, name);
    return value === undefined ? undefined : Number(value);
}

function storedTokensAreFresh(state: StorageStateObject): boolean {
    return (
        storedValue(state, 'access_token') !== undefined &&
        storedValue(state, 'id_token') !== undefined &&
        expiresLater(storedExpiry(state, 'expires_at'), storedExpiry(state, 'id_token_expires_at'))
    );
}

/**
 * The storage state saved for an account at an origin, its token entries replaced by tokens the
 * identity provider issued for its refresh token whenever the saved access or id token is close to
 * expiry. Every exchange saves the new tokens back to the file, so later workers start from them;
 * an account signed in again brings its new identity provider cookies along.
 */
export async function freshStorageState(account: AccountKey, origin: Origin): Promise<StorageStateObject> {
    const path = statePaths.storageState(account, origin);
    if (storedTokensAreFresh(readStorageState(path))) {
        return readStorageState(path);
    }
    const tokens = await tokenSourceFor(account, origin).tokens();
    return withTokens(readStorageState(path), tokens);
}
