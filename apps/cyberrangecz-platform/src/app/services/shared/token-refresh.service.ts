import { inject, Injectable } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { BehaviorSubject, concatMap, from, Observable, of } from 'rxjs';
import { HttpRequest } from '@angular/common/http';

export enum TokenRefreshState {
    REFRESHING,
    FAILED,
    OK,
}

@Injectable({ providedIn: 'root' })
/**
 * Service responsible for refreshing access token
 *
 * @note • requires {@link OAuthService}
 */
export class TokenRefreshService {
    private readonly TOKEN_PREFIX = 'Bearer ';

    private oauthService = inject(OAuthService);
    private stateSubject: BehaviorSubject<number> = new BehaviorSubject(
        TokenRefreshState.OK
    );

    /**
     * @returns Observable that emits the immediate state and all subsequent states of token refreshing
     */
    get stateObservable(): Observable<TokenRefreshState> {
        return this.stateSubject.asObservable();
    }

    /**
     * @returns Immediate state of token refreshing
     */
    get immediateState(): TokenRefreshState {
        return this.stateSubject.value;
    }

    /**
     * Refreshes token if it is expired
     *
     * @returns Observable that emits true if token was refreshed successfully, false otherwise
     */
    refreshToken(): Observable<TokenRefreshState> {
        if (this.isTokenExpired()) {
            console.log('token expired');
            this.stateSubject.next(TokenRefreshState.REFRESHING);
            return from(
                this.oauthService.discoveryDocumentLoaded
                    ? Promise.resolve()
                    : this.oauthService.loadDiscoveryDocument()
            ).pipe(
                concatMap(() =>
                    this.oauthService.refreshToken().then(
                        () => {
                            this.stateSubject.next(TokenRefreshState.OK);
                            return TokenRefreshState.OK;
                        },
                        () => {
                            this.stateSubject.next(TokenRefreshState.FAILED);
                            return TokenRefreshState.FAILED;
                        }
                    )
                )
            );
        }
        this.stateSubject.next(TokenRefreshState.OK);
        return of(TokenRefreshState.OK);
    }

    /**
     * Updates the request with a latest token
     *
     * @param req request to be updated
     * @returns updated request
     */
    updateRequestToken(req: HttpRequest<unknown>): HttpRequest<unknown> {
        return req.clone({
            setHeaders: {
                Authorization:
                    this.TOKEN_PREFIX + this.oauthService.getAccessToken(),
            },
        });
    }

    /**
     * Checks whether the expiration time of the token has passed
     *
     * @returns true if token is overdue, false otherwise
     */
    isTokenExpired(): boolean {
        return (
            new Date().getTime().valueOf() >
            this.oauthService.getAccessTokenExpiration()
        );
    }

    /**
     * Checks whether the token can be refreshed
     *
     * @returns true has refresh token and token endpoint is set, false otherwise
     */
    canRefresh(): boolean {
        return (
            !!this.oauthService.getRefreshToken() &&
            !!this.oauthService.tokenEndpoint
        );
    }
}
