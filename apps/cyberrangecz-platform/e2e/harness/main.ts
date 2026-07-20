import { importProvidersFrom } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideSentinelNotifications } from '@sentinel/layout/notification';
import {
    createSqliteEventDb,
    provideEntityResolverService,
    provideEventBroker,
} from '@crczp/event-query-engine';
import { provideTestPortalConfig } from '@crczp/test-utils';
import { TrainingApiModule } from '@crczp/training-api';
import { HarnessComponent } from './harness.component';
import { harnessRoutes } from './harness.routes';

bootstrapApplication(HarnessComponent, {
    providers: [
        provideAnimations(),
        provideHttpClient(withInterceptorsFromDi()),
        provideTestPortalConfig(),
        provideSentinelNotifications(),
        importProvidersFrom(TrainingApiModule),
        provideEventBroker(
            createSqliteEventDb(
                () => new Worker(new URL('./cache.worker.ts', import.meta.url), { type: 'module' }),
            ),
        ),
        provideEntityResolverService(),
        provideRouter(harnessRoutes, withHashLocation()),
    ],
}).catch((error: unknown) => {
    console.error('Harness bootstrap failed:', error);
});
