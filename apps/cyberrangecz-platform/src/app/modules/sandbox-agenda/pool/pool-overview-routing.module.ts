import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SANDBOX_POOL_EDIT_PATH, SANDBOX_POOL_ID_SELECTOR, SANDBOX_POOL_NEW_PATH} from '@crczp/sandbox-agenda';
import {PoolOverviewComponent} from '@crczp/sandbox-agenda/pool-overview';
import {PoolBreadcrumbResolver, PoolCommentResolver, PoolResolver} from '@crczp/sandbox-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: PoolOverviewComponent,
    },
    {
        path: SANDBOX_POOL_NEW_PATH,
        loadChildren: () => import('./edit/pool-edit.module').then((m) => m.PoolEditModule),
        resolve: {
            breadcrumb: PoolBreadcrumbResolver,
        },
        data: {
            title: 'Create Pool',
        },
    },
    {
        path: `:${SANDBOX_POOL_ID_SELECTOR}`,
        loadChildren: () => import('./detail/pool-detail.module').then((m) => m.PoolDetailModule),
        resolve: {
            breadcrumb: PoolBreadcrumbResolver,
            subtitle: PoolCommentResolver,
        },
        data: {
            title: 'Pool Detail',
        },
    },
    {
        path: `:${SANDBOX_POOL_ID_SELECTOR}/${SANDBOX_POOL_EDIT_PATH}`,
        loadChildren: () => import('./edit/pool-edit.module').then((m) => m.PoolEditModule),
        resolve: {
            breadcrumb: PoolBreadcrumbResolver,
            pool: PoolResolver,
        },
        data: {
            title: 'Edit Pool',
        },
    },
];

/**
 * Routing module for sandbox pool overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PoolOverviewRoutingModule {}
