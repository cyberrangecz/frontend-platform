import { Routes } from '@angular/router';

/**
 * Routes for the e2e harness. Each entry is a stand-alone page that
 * mounts a single production component under test. Routes use lazy
 * loading so the harness build stays small per scenario.
 */
export const harnessRoutes: Routes = [
    {
        path: '',
        loadComponent: () => import('./pages/cache-probe.page').then((m) => m.CacheProbePage),
    },
    {
        path: 'tooltip',
        loadComponent: () => import('./pages/tooltip-overflow.page').then((m) => m.TooltipOverflowPage),
    },
];
