import { environment } from '../environment';
import { readStorageState, storedValue } from '../state-files';
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

/**
 * Exchanges a refresh token for fresh tokens at the identity provider, keeping the latest set
 * until shortly before its tokens expire.
 */
export class RefreshTokenSource {
    private current: TokenSet | undefined;
    private pending: Promise<TokenSet> | undefined;

    constructor(private refreshToken: string) {}

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

    private async exchange(): Promise<TokenSet> {
        const context = await requestContext();
        const response = await context.post(await tokenEndpoint(), {
            form: {
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken,
                client_id: environment.clientId,
            },
        });
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
        return this.current;
    }

    /** Builds a source from the refresh token a saved storage state holds for the application origin. */
    static fromStorageState(path: string): RefreshTokenSource {
        const refreshToken = storedValue(readStorageState(path), 'refresh_token');
        if (!refreshToken) {
            throw new Error(`Storage state ${path} holds no refresh_token`);
        }
        return new RefreshTokenSource(refreshToken);
    }
}

const sourcesByStatePath = new Map<string, RefreshTokenSource>();

/** The worker's one token source for the account a storage state file belongs to. */
export function tokenSourceFor(path: string): RefreshTokenSource {
    let source = sourcesByStatePath.get(path);
    if (!source) {
        source = RefreshTokenSource.fromStorageState(path);
        sourcesByStatePath.set(path, source);
    }
    return source;
}
