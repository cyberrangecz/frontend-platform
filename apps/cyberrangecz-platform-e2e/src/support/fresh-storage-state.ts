import { expiresLater, type TokenSet, tokenSourceFor } from './api/token-source';
import { readStorageState, type StorageStateObject, storedValue } from './state-files';

type LocalStorageEntry = StorageStateObject['origins'][number]['localStorage'][number];

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

/** The entries `angular-oauth2-oidc` keeps for a token set, as its `storeAccessTokenResponse` and `storeIdToken` write them. */
function tokenEntries(tokens: TokenSet): LocalStorageEntry[] {
    return [
        { name: 'access_token', value: tokens.accessToken },
        { name: 'access_token_stored_at', value: String(tokens.accessTokenIssuedAt) },
        { name: 'expires_at', value: String(tokens.accessTokenExpiresAt) },
        { name: 'refresh_token', value: tokens.refreshToken },
        ...(tokens.grantedScope
            ? [{ name: 'granted_scopes', value: JSON.stringify(tokens.grantedScope.split(' ')) }]
            : []),
        { name: 'id_token', value: tokens.idToken },
        { name: 'id_token_claims_obj', value: tokens.idTokenClaimsJson },
        { name: 'id_token_expires_at', value: String(tokens.idTokenExpiresAt) },
        { name: 'id_token_stored_at', value: String(tokens.idTokenIssuedAt) },
    ];
}

function withTokens(state: StorageStateObject, tokens: TokenSet): StorageStateObject {
    const entries = tokenEntries(tokens);
    const replacedNames = new Set(entries.map((entry) => entry.name));
    return {
        ...state,
        origins: state.origins.map((origin) =>
            origin.localStorage.some((entry) => entry.name === 'refresh_token')
                ? {
                      ...origin,
                      localStorage: [
                          ...origin.localStorage.filter((entry) => !replacedNames.has(entry.name)),
                          ...entries,
                      ],
                  }
                : origin,
        ),
    };
}

/**
 * The storage state saved at a path, its token entries replaced by tokens the identity provider
 * issued for its refresh token whenever the saved access or id token is close to expiry. The saved
 * file is never written; the latest tokens are kept for the worker.
 */
export async function freshStorageState(path: string): Promise<StorageStateObject> {
    const state = readStorageState(path);
    if (storedTokensAreFresh(state)) {
        return state;
    }
    return withTokens(state, await tokenSourceFor(path).tokens());
}
