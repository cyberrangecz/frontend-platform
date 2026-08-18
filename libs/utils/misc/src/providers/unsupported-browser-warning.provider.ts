import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { EMPTY, timer } from 'rxjs';
import { filter, switchMap, take } from 'rxjs/operators';
import { NotificationService } from '../service/error-handling/notification.service';
import { BrowserUtils } from '../utils/functions/browser-utils';

const NAVIGATION_SETTLE_DELAY_MS = 1000;
const WARNING_SHOWN_KEY = 'unsupported-browser-warning-shown';
const WARNING_TITLE = 'Unsupported browser';
const WARNING_SOURCE = 'CyberRangeCZ Platform';
const WARNING_MESSAGE =
    'This application is developed and tested for Chromium-based browsers, utilizing features that may not be fully supported in your current browser. For the best experience, please switch to a Chromium-based browser such as Google Chrome, Microsoft Edge, or Brave.';

/**
 * Provides an application initializer emitting a warning notification when the browser is not built on Chromium.
 * The notification is emitted once the router settles on a final route, so it survives the redirects performed during startup.
 * Stays silent on Chromium-based browsers and after the warning has already been shown in the current browser session.
 *
 * @returns {EnvironmentProviders} Providers to be listed in the application bootstrap.
 */
export function provideUnsupportedBrowserWarning(): EnvironmentProviders {
    return provideAppInitializer(() => {
        if (
            BrowserUtils.isChromiumBased() ||
            sessionStorage.getItem(WARNING_SHOWN_KEY) !== null
        ) {
            return;
        }
        sessionStorage.setItem(WARNING_SHOWN_KEY, 'true');
        const router = inject(Router);
        const notificationService = inject(NotificationService);
        router.events
            .pipe(
                filter(
                    (event) =>
                        event instanceof NavigationStart ||
                        event instanceof NavigationEnd,
                ),
                switchMap((event) =>
                    event instanceof NavigationEnd
                        ? timer(NAVIGATION_SETTLE_DELAY_MS)
                        : EMPTY,
                ),
                take(1),
                switchMap(() =>
                    notificationService.emit(
                        'warning',
                        WARNING_TITLE,
                        [WARNING_MESSAGE],
                        WARNING_SOURCE,
                    ),
                ),
            )
            .subscribe();
    });
}
