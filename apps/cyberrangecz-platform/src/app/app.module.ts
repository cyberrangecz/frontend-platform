import {
    HTTP_INTERCEPTORS,
    HttpClient,
    provideHttpClient,
    withInterceptors,
    withInterceptorsFromDi,
} from '@angular/common/http';
import {
    ErrorHandler,
    importProvidersFrom,
    inject,
    Injectable,
    NgModule,
} from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {
    BrowserAnimationsModule,
    provideAnimations,
} from '@angular/platform-browser/animations';
import { SentinelConfirmationDialogComponent } from '@sentinel/components/dialogs';
import { AppComponent } from './app.component';
import { loadingInterceptor } from './services/http-interceptors/loading-interceptor';
import {
    APP_CONFIG,
    appConfigProvider,
    SentinelConfig,
} from '@sentinel/common/dynamic-env';
import { tokenRefreshInterceptor } from './services/http-interceptors/token-refresh-interceptor';
import { TokenRefreshService } from './services/shared/token-refresh.service';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { AppRoutingModule } from './app-routing.module';
import { LoginComponent } from './components/login/login.component';
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
import { RoleService } from './services/role.service';
import { errorLogInterceptor } from './services/http-interceptors/error-log-interceptor';
import { catchError, Observable, retry, throwError } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    provideHttpCache,
    withHttpCacheInterceptor,
    withLocalStorage,
} from '@ngneat/cashew';
import { environment } from '../environments/environment';
import { LoadingService } from './services/loading.service';
import {
    ErrorHandlerService,
    NotificationService,
    PortalConfig,
} from '@crczp/utils';

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
                    return throwError(err);
                })
            );
        } else {
            return throwError(
                () =>
                    new Error(
                        'Failed to read authorizationUrl from SentinelUagStrategyConfig'
                    )
            );
        }
    }
}

@NgModule({
    declarations: [AppComponent],
    imports: [
        BrowserModule,
        BrowserAnimationsModule,
        AppRoutingModule,
        LoginComponent,
        SentinelLayout1Component,
        SentinelConfirmationDialogComponent,
    ],
    providers: [
        importProvidersFrom(BrowserModule),
        provideAnimations(),
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
            withInterceptors(
                [
                    tokenRefreshInterceptor,
                    loadingInterceptor,
                    errorLogInterceptor,
                ].concat(
                    //NOTE caching disabled for debug mode
                    environment.production ? withHttpCacheInterceptor() : []
                )
            )
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
    ].concat(
        //NOTE caching disabled for debug mode
        environment.production ? [provideHttpCache(withLocalStorage())] : []
    ),
    bootstrap: [AppComponent],
})
export class AppModule {}
