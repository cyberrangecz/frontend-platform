import {
    provideBrowserGlobalErrorListeners,
    provideZoneChangeDetection,
} from '@angular/core';
import {
    APP_CONFIG,
    appConfigProvider,
    SentinelBootstrapper,
    SentinelConfig,
} from '@sentinel/common/dynamic-env';
import { App } from './app/app';
import { provideRouter } from '@angular/router';
import { appRoutes } from './app/app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
    provideHttpCache,
    withHttpCacheInterceptor,
    withLocalStorage,
} from '@ngneat/cashew';
import { PortalConfig } from '@crczp/utils';
import { provideSentinelNotifications } from '@sentinel/layout/notification';

SentinelBootstrapper.bootstrapApplication<SentinelConfig>(
    'assets/config.json',
    App,
    {
        providers: [
            provideBrowserGlobalErrorListeners(),
            appConfigProvider,
            {
                provide: PortalConfig,
                useFactory: (config: SentinelConfig) =>
                    PortalConfig.schema().parse(config),
                deps: [APP_CONFIG],
            },
            provideSentinelNotifications(),
            provideZoneChangeDetection({ eventCoalescing: true }),
            provideRouter(appRoutes),
            provideHttpClient(withInterceptors([withHttpCacheInterceptor()])),
            provideHttpCache(withLocalStorage()),
        ],
    }
);
