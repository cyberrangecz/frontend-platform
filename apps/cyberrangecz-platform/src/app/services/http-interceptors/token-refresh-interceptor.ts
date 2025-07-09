import {HttpEvent, HttpHandlerFn, HttpRequest} from '@angular/common/http';
import {inject} from '@angular/core';
import {concatMap, EMPTY, Observable, skipWhile, switchMap, take} from 'rxjs';
import {TokenRefreshService, TokenRefreshState} from '../shared/token-refresh.service';
import {SentinelAuthConfig, SentinelAuthService} from '@sentinel/auth';

/**
 * Intercepts http requests, to validate whether the access token is up-to-date.
 *
 * The flow is as follows:
 * 1. The token is not expired → the request is sent.
 * 2. The token is expired → the request is sent after refreshing the token.
 * 3. The token is already being refreshed → the request is sent after refreshing finishes.
 * 4. The token refresh fails → the user is logged out.
 *
 * @note • OIDC requests are not handled, to ensure that the OIDC flow is not interrupted
 * @note • requires {@link TokenRefreshService}
 * @note • requires {@link SentinelAuthService}
 * @note • requires {@link SentinelAuthConfig}
 */

function isOIDCRequest(req: HttpRequest<any>, sentinelAuthConfig: SentinelAuthConfig): boolean {
    return sentinelAuthConfig.providers?.some(
        (provider) => provider.oidcConfig?.issuer && req.url.startsWith(provider.oidcConfig?.issuer),
    ) || false;
}

export function tokenRefreshInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    const tokenRefreshService = inject(TokenRefreshService);
    const sentinelAuthService = inject(SentinelAuthService);

    if (isOIDCRequest(req, inject(SentinelAuthConfig))) {
        return next(req);
    }

    function handleCurrentState(req: HttpRequest<any>, state: TokenRefreshState): Observable<HttpEvent<any>> {
        switch (state) {
            case TokenRefreshState.REFRESHING:
                return waitUntilRefreshed(req);
            case TokenRefreshState.OK:
                if (tokenRefreshService.isTokenExpired() && tokenRefreshService.canRefresh()) {
                    return refreshAndSend(req);
                }
                return next(req);
            case TokenRefreshState.FAILED:
                sentinelAuthService.logout();
                return EMPTY;
        }
    }

    function waitUntilRefreshed(req: HttpRequest<any>): Observable<HttpEvent<any>> {
        return tokenRefreshService.stateObservable.pipe(
            skipWhile((state) => state === TokenRefreshState.REFRESHING),
            take(1),
            switchMap((state) =>
                handleCurrentState(tokenRefreshService.updateRequestToken(req), state),
            ),
        );
    }

    function refreshAndSend(req: HttpRequest<any>): Observable<HttpEvent<any>> {
        return tokenRefreshService.refreshToken().pipe(
            take(1),
            concatMap((state) =>
                handleCurrentState(tokenRefreshService.updateRequestToken(req), state),
            ),
        );
    }

    return handleCurrentState(req, tokenRefreshService.immediateState);
}


