import { Route } from '@angular/router';
import { TopologyExample } from './topology/topology-example';

export const appRoutes: Route[] = [
    {
        path: 'topology',
        component: TopologyExample,
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'topology',
    },
];
