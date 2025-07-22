import {Route} from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: 'topology',
        loadComponent: () => import("@crczp/topology-graph").then(
            m => m.TopologyComponent
        )
    }
    , {
        path: '',
        pathMatch: 'full',
        redirectTo: 'topology'
    }
];
