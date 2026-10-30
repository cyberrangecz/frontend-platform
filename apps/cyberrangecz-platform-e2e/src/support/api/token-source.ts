import type { APIResponse } from '@playwright/test';
import { environment } from '../environment';
import { readStorageState, rereadStorageState, saveStorageState, storedValue, withFileLock } from '../state-files';
import { withTokens } from '../storage-state-tokens';
import { requestContext } from './request-context';

/** How long before expiry a token counts as expired. */
export const TOKEN_EXPIRY_MARGIN_MILLISECONDS = 30_000;

let tokenEndpointPromise: Promise<string> | undefined;

function tokenEndpoint(): Promise<string> {
    tokenEndpointPromise ??= (async () => {
        const context = await requestContext();
        const response = await context.get(environment.discoveryUrl);
        if (!response.ok()) {
            throw new Error(`OIDC discovery answered ${response.status()}`);
        }
        const discovery = (await response.json()) as { token_endpoint: string };
        return discovery.token_endpoint;
    })().catch((error: unknown) => {
        tokenEndpointPromise = undefined;
        throw error;
    });
    return tokenEndpointPromise;
}

/** Tokens an identity provider issued, with the instants (epoch milliseconds) they were issued and expire at. */
export interface TokenSet {
    accessToken: string;
    accessTokenIssuedAt: number;
    accessTokenExpiresAt: number;
    refreshToken: string;
    grantedScope?: string;
    idToken: string;
    idTokenIssuedAt: number;
    idTokenExpiresAt: number;
    idTokenClaimsJson: string;
}

/** Whether every given expiry lies beyond the expiry margin; an undefined expiry never does. */
export function expiresLater(...expiries: (number | undefined)[]): boolean {
    return expiries.every(
        (expiresAt) =>
            expiresAt !== undefined && expiresAt - TOKEN_EXPIRY_MARGIN_MILLISECONDS > Date.now(),
    );
}

interface DecodedToken {
    token: string;
    json: string;
    issuedAtMilliseconds: number;
    expiresAtMilliseconds: number;
}

/** Decodes the payload of a JWT, failing with the token's name when it is absent or malformed. */
function decodeToken(token: string | undefined, name: string): DecodedToken {
    if (!token) {
        throw new Error(`Token refresh answered no ${name}`);
    }
    const json = Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8');
    let claims: { iat?: unknown; exp?: unknown } | null;
    try {
        claims = JSON.parse(json) as { iat?: unknown; exp?: unknown } | null;
    } catch (cause) {
        throw new Error(`Token refresh answered a malformed ${name}`, { cause });
    }
    if (typeof claims?.iat !== 'number' || typeof claims.exp !== 'number') {
        throw new Error(`Token refresh answered a ${name} without numeric iat and exp claims`);
    }
    return {
        token,
        json,
        issuedAtMilliseconds: claims.iat * 1000,
        expiresAtMilliseconds: claims.exp * 1000,
    };
}

interface TokenResponse {
    access_token?: string;
    refresh_token?: string;
    id_token?: string;
    scope?: string;
}

/** Where a token source keeps the tokens it shares with other workers. */
export interface TokenStore {
    /** The refresh token currently saved, which another worker may have saved after this one last exchanged. */
    savedRefreshToken(): string | undefined;
    /** Saves a token set as the newest. */
    save(tokens: TokenSet): void;
}

/** The issue instant of a refresh token in epoch seconds, 0 when it is not a JWT with a numeric `iat` claim. */
function refreshTokenIssuedAt(token: string): number {
    try {
        const claims = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as {
            iat?: unknown;
        } | null;
        return typeof claims?.iat === 'number' ? claims.iat : 0;
    } catch {
        return 0;
    }
}

/** Starts a new session for the account and resolves to its refresh token. */
export type SessionRenewal = () => Promise<string>;

/** Whether a token response refuses the refresh token because the session behind it has ended or expired. */
async function refusesEndedSession(response: APIResponse): Promise<boolean> {
    if (response.status() !== 400) {
        return false;
    }
    try {
        return ((await response.json()) as { error?: unknown }).error === 'invalid_grant';
    } catch {
        return false;
    }
}

/**
 * Exchanges a refresh token for fresh tokens at the identity provider, keeping the latest set
 * until shortly before its tokens expire. With a token store, it exchanges the newest refresh
 * token among its own and the stored one, and saves every new set. With a session renewal, a
 * refresh token whose session has ended is replaced by a newer stored one or, when none is
 * stored, by the renewal's.
 */
export class RefreshTokenSource {
    private current: TokenSet | undefined;
    private pending: Promise<TokenSet> | undefined;

    constructor(
        private refreshToken: string,
        private readonly store?: TokenStore,
        private readonly renewSession?: SessionRenewal,
    ) {}

    /** The latest access token, exchanged again when the held one is close to expiry. */
    async accessToken(): Promise<string> {
        return (
            await this.latest((held) => expiresLater(held.accessTokenExpiresAt))
        ).accessToken;
    }

    /** The latest tokens, exchanged again when the held access or id token is close to expiry. */
    tokens(): Promise<TokenSet> {
        return this.latest((held) =>
            expiresLater(held.accessTokenExpiresAt, held.idTokenExpiresAt),
        );
    }

    private latest(isFresh: (held: TokenSet) => boolean): Promise<TokenSet> {
        if (this.current && isFresh(this.current)) {
            return Promise.resolve(this.current);
        }
        this.pending ??= this.exchange().finally(() => {
            this.pending = undefined;
        });
        return this.pending;
    }

    private adoptNewerSavedRefreshToken(): void {
        const saved = this.store?.savedRefreshToken();
        if (saved && refreshTokenIssuedAt(saved) > refreshTokenIssuedAt(this.refreshToken)) {
            this.refreshToken = saved;
        }
    }

    private async requestTokens(): Promise<APIResponse> {
        const context = await requestContext();
        return context.post(await tokenEndpoint(), {
            form: {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: environment.clientId,
            },
        });
    }

    private async exchange(): Promise<TokenSet> {
        this.adoptNewerSavedRefreshToken();
        let response = await this.requestTokens();
        if (this.renewSession && (await refusesEndedSession(response))) {
            const refused = this.refreshToken;
            this.adoptNewerSavedRefreshToken();
            if (this.refreshToken === refused) {
                this.refreshToken = await this.renewSession();
            }
            response = await this.requestTokens();
        }
        if (!response.ok()) {
            throw new Error(
                `Token refresh answered ${response.status()}: ${await response.text()}`,
            );
        }
        const body = (await response.json()) as TokenResponse;
        const accessToken = decodeToken(body.access_token, 'access_token');
        const idToken = decodeToken(body.id_token, 'id_token');
        this.refreshToken = body.refresh_token ?? this.refreshToken;
        this.current = {
            accessToken: accessToken.token,
            accessTokenIssuedAt: accessToken.issuedAtMilliseconds,
            accessTokenExpiresAt: accessToken.expiresAtMilliseconds,
            refreshToken: this.refreshToken,
            grantedScope: body.scope,
            idToken: idToken.token,
            idTokenIssuedAt: idToken.issuedAtMilliseconds,
            idTokenExpiresAt: idToken.expiresAtMilliseconds,
            idTokenClaimsJson: idToken.json,
        };
        this.store?.save(this.current);
        return this.current;
    }

    /**
     * Builds a source from the refresh token a saved storage state holds for the application
     * origin; every exchange saves its tokens into that storage state file. Without a session
     * renewal, a refresh token whose session has ended stays refused.
     */
    static fromStorageState(path: string, renewSession?: SessionRenewal): RefreshTokenSource {
        const refreshToken = storedValue(readStorageState(path), 'refresh_token');
        if (!refreshToken) {
            throw new Error(`Storage state ${path} holds no refresh_token`);
        }
        return new RefreshTokenSource(refreshToken, {
            savedRefreshToken: () => storedValue(rereadStorageState(path), 'refresh_token'),
            save: (tokens) =>
                withFileLock(path, () => {
                    const state = rereadStorageState(path);
                    const saved = storedValue(state, 'refresh_token');
                    if (!saved || refreshTokenIssuedAt(saved) <= refreshTokenIssuedAt(tokens.refreshToken)) {
                        saveStorageState(path, withTokens(state, tokens));
                    }
                }),
        }, renewSession);
    }
}
