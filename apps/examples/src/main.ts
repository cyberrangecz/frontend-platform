// Apply global mixins
import '@crczp/mixins';

import {
    ErrorHandler,
    importProvidersFrom,
    inject,
    Injectable,
} from '@angular/core';
import {
    APP_CONFIG,
    appConfigProvider,
    SentinelBootstrapper,
    SentinelConfig,
} from '@sentinel/common/dynamic-env';
import { provideRouter } from '@angular/router';
import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptors,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    provideHttpCache,
    withHttpCacheInterceptor,
    withLocalStorage,
} from '@ngneat/cashew';
import {
    ErrorHandlerService,
    NotificationService,
    PortalConfig,
} from '@crczp/utils';
import { provideSentinelNotifications } from '@sentinel/layout/notification';
import {
    provideSentinelAuth,
    SentinelAuthConfig,
    SentinelAuthContext,
    SentinelAuthErrorHandler,
    SentinelAuthorizationStrategy,
    SentinelUagStrategyConfig,
    UnauthorizedInterceptor,
    User,
    UserDTO,
} from '@sentinel/auth';
import { catchError, Observable, retry, throwError } from 'rxjs';
import {
    BrowserAnimationsModule,
    provideAnimations,
} from '@angular/platform-browser/animations';
import { provideNativeDateAdapter } from '@angular/material/core';
import { provideSentinelMarkdownEditorConfig } from '@sentinel/components/markdown-editor';
import { RoleService } from './services/role.service';
import { LoadingService } from './services/loading.service';
import { TokenRefreshService } from './services/shared/token-refresh.service';
import { tokenRefreshInterceptor } from './services/http-interceptors/token-refresh-interceptor';
import { loadingInterceptor } from './services/http-interceptors/loading-interceptor';
import { errorLogInterceptor } from './services/http-interceptors/error-log-interceptor';
import { App } from './app/app';
import { map } from 'rxjs/operators';
import { appRoutes } from './app/app.routes';

@Injectable()
export class SentinelUagAuthorizationStrategy extends SentinelAuthorizationStrategy {
    private configService = inject(SentinelAuthContext);
    private errorHandler = inject(SentinelAuthErrorHandler);
    private http = inject(HttpClient);
    private readonly POSSIBLE_RETRIES = 3;

    authorize(): Observable<User> {
        const config = this.configService.config
            .authorizationStrategyConfig as SentinelUagStrategyConfig;
        if (config.authorizationUrl) {
            return this.http.get<UserDTO>(config.authorizationUrl).pipe(
                map((resp) => User.fromDTO(resp)),
                retry(this.POSSIBLE_RETRIES),
                catchError((err) => {
                    this.errorHandler.emit(err, 'Authorizing to User & Group');
                    return throwError(() => err);
                }),
            );
        } else {
            return throwError(
                () =>
                    new Error(
                        'Failed to read authorizationUrl from SentinelUagStrategyConfig',
                    ),
            );
        }
    }
}

SentinelBootstrapper.bootstrapApplication('assets/config.json', App, {
    providers: [
        importProvidersFrom(BrowserAnimationsModule),
        provideAnimations(),
        provideNativeDateAdapter(),
        appConfigProvider,
        {
            provide: PortalConfig,
            useFactory: (config: SentinelConfig) =>
                PortalConfig.schema().parse(config),
            deps: [APP_CONFIG],
        },
        provideSentinelNotifications(),
        ErrorHandlerService,
        { provide: ErrorHandler, useExisting: ErrorHandlerService },
        {
            provide: SentinelAuthErrorHandler,
            useExisting: ErrorHandlerService,
        },
        {
            provide: HTTP_INTERCEPTORS,
            useClass: UnauthorizedInterceptor,
            multi: true,
        },
        provideHttpClient(
            withInterceptorsFromDi(),
            withInterceptors([
                tokenRefreshInterceptor,
                loadingInterceptor,
                errorLogInterceptor,
                withHttpCacheInterceptor(),
            ]),
        ),
        {
            provide: SentinelAuthConfig,
            useFactory: () => inject(PortalConfig).authConfig,
            deps: [PortalConfig],
        },
        RoleService,
        {
            provide: SentinelAuthorizationStrategy,
            useClass: SentinelUagAuthorizationStrategy,
        },
        provideSentinelAuth(() => inject(APP_CONFIG).authConfig, [APP_CONFIG]),
        LoadingService,
        NotificationService,
        TokenRefreshService,
        provideSentinelMarkdownEditorConfig({
            markdownParser: {},
        }),
        provideHttpCache(withLocalStorage()),
        provideRouter(appRoutes),
    ],
}).catch((err) => console.error('Error bootstrapping application:', err));
