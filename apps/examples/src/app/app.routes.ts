import { Route } from '@angular/router';
import { RunExample } from './run/run-example';

export const appRoutes: Route[] = [
    {
        path: 'test',
        component: RunExample,
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'test',
    },
];
