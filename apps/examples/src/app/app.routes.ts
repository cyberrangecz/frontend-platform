import { Route } from '@angular/router';
import { RootComponent } from './root.component';
import {
    sentinelAuthGuardWithLogin,
    sentinelNegativeAuthGuard,
} from '@sentinel/auth';
import { LoginComponent } from '../login/login.component';

export const appRoutes: Route[] = [
    {
        path: 'test',
        component: RootComponent,
        canActivate: [sentinelAuthGuardWithLogin],
    },
    {
        path: 'login',
        component: LoginComponent,
        canActivate: [sentinelNegativeAuthGuard],
    },
    {
        path: '',
        pathMatch: 'full',
        redirectTo: 'test',
    },
];
