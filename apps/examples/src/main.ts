import {provideBrowserGlobalErrorListeners, provideZoneChangeDetection} from '@angular/core';
import {SentinelBootstrapper, SentinelConfig} from '@sentinel/common/dynamic-env';
import {App} from "./app/app";
import {provideRouter} from "@angular/router";
import {appRoutes} from "./app/app.routes";
import {provideHttpClient, withInterceptors} from "@angular/common/http";
import {provideHttpCache, withHttpCacheInterceptor} from "@ngneat/cashew";


SentinelBootstrapper.bootstrapApplication<SentinelConfig>('assets/config.json', App,
    {
        providers: [
            provideBrowserGlobalErrorListeners(),
            provideZoneChangeDetection({eventCoalescing: true}),
            provideRouter(appRoutes),
            provideHttpClient(withInterceptors([withHttpCacheInterceptor()])),
            provideHttpCache()
        ]
    });
