import { enableProdMode } from '@angular/core';
import { environment } from './environments/environment';
import {
    SentinelBootstrapper,
    SentinelConfig,
} from '@sentinel/common/dynamic-env';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app.module';

if (environment.production) {
    enableProdMode();
}

SentinelBootstrapper.bootstrap<AppModule, SentinelConfig>(
    'assets/config.json',
    AppModule,
    platformBrowser()
).then(
    () => {
        /* Bootstrap successful */
    },
    (error) => console.error('Error during bootstrap:', error)
);
