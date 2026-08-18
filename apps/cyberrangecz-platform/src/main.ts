import {
    enableProdMode,
    ErrorHandler,
    importProvidersFrom,
    inject,
    Injectable,
    provideAppInitializer,
} from '@angular/core';
import { environment } from './environments/environment';
import {
    APP_CONFIG,
    appConfigProvider,
    SentinelBootstrapper,
    SentinelConfig,
} from '@sentinel/common/dynamic-env';
import { AppComponent } from './app/app.component';
import {
    BrowserAnimationsModule,
    provideAnimations,
} from '@angular/platform-browser/animations';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptors,
    withInterceptorsFromDi,
} from '@angular/common/http';
import { loadingInterceptor } from './app/services/http-interceptors/loading-interceptor';
import { tokenRefreshInterceptor } from './app/services/http-interceptors/token-refresh-interceptor';
import { TokenRefreshService } from './app/services/shared/token-refresh.service';
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
import { errorLogInterceptor } from './app/services/http-interceptors/error-log-interceptor';
import {
    catchError,
    firstValueFrom,
    Observable,
    retry,
    throwError,
} from 'rxjs';
import { map } from 'rxjs/operators';
import {
    provideHttpCache,
    withHttpCacheInterceptor,
    withLocalStorage,
} from '@ngneat/cashew';
import { LoadingService } from './app/services/loading.service';
import {
    ErrorHandlerService,
    NotificationService,
    PortalConfig,
} from '@crczp/utils';
import { provideNativeDateAdapter } from '@angular/material/core';
import { RoleService } from './app/services/role.service';
import { APP_ROUTES } from './app/app-routes';
import { provideSentinelMarkdownEditorConfig } from '@sentinel/components/markdown-editor';
import {
    CACHE_CLAIM,
    CacheService,
    createSqliteEventDb,
    provideEventCache,
    requestSingleTabClaim,
    withCacheBlockedRoute,
} from '@crczp/event-query-engine';

const cacheClaim = requestSingleTabClaim('event-cache-platform-v1');

/** Longest the startup housekeeping may delay the first render before it is abandoned. */
const CACHE_STARTUP_BUDGET_MS = 15_000;

/**
 * Awaits startup housekeeping without letting it decide whether the application renders:
 * a failure or an overrun is reported and the result discarded.
 *
 * @param work Housekeeping to await.
 * @param label Operation name used in the reported message.
 * @returns Promise settling once the work finishes, fails, or exhausts the budget.
 */
function withoutBlockingStartup(
    work: Promise<unknown>,
    label: string,
): Promise<void> {
    const budget = new Promise<void>((resolve) =>
        setTimeout(() => {
            console.error(
                `${label} exceeded its startup budget and was abandoned.`,
            );
            resolve();
        }, CACHE_STARTUP_BUDGET_MS),
    );
    return Promise.race([
        work.then(
            () => undefined,
            (error: unknown) => {
                console.error(`${label} failed.`, error);
            },
        ),
        budget,
    ]);
}

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

if (environment.production) {
    enableProdMode();
}

SentinelBootstrapper.bootstrapApplication('assets/config.json', AppComponent, {
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
        provideRouter(
            withCacheBlockedRoute(APP_ROUTES),
            withComponentInputBinding(),
        ),
        provideEventCache(
            createSqliteEventDb(
                () =>
                    new Worker(new URL('./cache.worker.ts', import.meta.url), {
                        type: 'module',
                    }),
                { until: cacheClaim.granted },
            ),
        ),
        { provide: CACHE_CLAIM, useValue: cacheClaim },
        provideAppInitializer(() => {
            const cache = inject(CacheService);
            const claim = inject(CACHE_CLAIM);
            return withoutBlockingStartup(
                claim.blocked.then((blocked) =>
                    blocked
                        ? undefined
                        : firstValueFrom(cache.evictStaleInstances()),
                ),
                'Event cache eviction',
            );
        }),
    ],
}).catch((err) => console.error('Error bootstrapping application:', err));
