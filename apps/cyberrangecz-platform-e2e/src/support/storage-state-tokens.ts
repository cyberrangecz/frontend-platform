import type { TokenSet } from './api/token-source';
import type { StorageStateObject } from './state-files';

type LocalStorageEntry = StorageStateObject['origins'][number]['localStorage'][number];

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

/** The storage state with the token entries of the origin that holds a refresh token replaced by those of a token set. */
export function withTokens(state: StorageStateObject, tokens: TokenSet): StorageStateObject {
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
