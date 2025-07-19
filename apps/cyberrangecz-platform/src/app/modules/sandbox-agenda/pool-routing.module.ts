import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SANDBOX_ROUTE_VARIABLES} from '@crczp/sandbox-agenda';
import {PoolOverviewComponent} from '@crczp/sandbox-agenda/pool-overview';
import {
    PoolBreadcrumbResolver,
    PoolCommentResolver,
    PoolResolver,
    RequestBreadcrumbResolver,
    RequestResolver,
    SandboxInstanceBreadcrumbResolver,
    SandboxInstanceResolver
} from '@crczp/sandbox-agenda/resolvers';
import {PATHS} from "../../paths";

const routes: Routes = [
    {
        path: '',
        component: PoolOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () => import('@crczp/sandbox-agenda/pool-edit').then((m) => m.PoolEditComponent),
        resolve: {
            breadcrumb: PoolBreadcrumbResolver,
        },
        data: {
            title: 'Create Pool',
        },
    },
    {
        path: `:${PATHS.SANDBOX.POOL_ID}/${PATHS.ACTION.EDIT}`,
        loadComponent: () => import('@crczp/sandbox-agenda/pool-edit').then((m) => m.PoolEditComponent),
        resolve: {
            breadcrumb: PoolBreadcrumbResolver,
            pool: PoolResolver,
        },
        data: {
            title: 'Edit Pool',
        },
    },
    {
        path: `:${PATHS.SANDBOX.POOL_ID}`,
        loadComponent: () => import('./pool/detail/pool-detail.module').then((m) => m.PoolDetailModule),
        resolve: {
            [SANDBOX_ROUTE_VARIABLES.POOL_DATA]: PoolResolver,
            breadcrumb: PoolBreadcrumbResolver,
            subtitle: PoolCommentResolver,
        },
        data: {
            title: 'Pool Detail',
        },

    },
    {
        path: `:${PATHS.SANDBOX.POOL_ID}/${PATHS.SANDBOX.SANDBOX_INSTANCE}/:${PATHS.SANDBOX.SANDBOX_INSTANCE_ID}`,
        loadChildren: () =>
            import('@crczp/sandbox-agenda/request-detail').then((m) => m.AllocationRequestDetailComponent),
        resolve: {
            breadcrumb: RequestBreadcrumbResolver,
            [SANDBOX_ROUTE_VARIABLES.POOL_DATA]: PoolResolver,
            [SANDBOX_ROUTE_VARIABLES.POOL_REQUEST_DATA]: RequestResolver,
        },
        data: {
            title: 'Allocation Request Stages',
        },
    },
    {
        path: `:${PATHS.SANDBOX.POOL_ID}/${PATHS.SANDBOX.SANDBOX_INSTANCE}/:${PATHS.SANDBOX.SANDBOX_INSTANCE_ID}/${PATHS.SANDBOX.SANDBOX_INSTANCE_CLEANUP}`,
        loadChildren: () =>
            import('@crczp/sandbox-agenda/request-detail').then((m) => m.CleanupRequestDetailComponent),
        resolve: {
            breadcrumb: RequestBreadcrumbResolver,
            [SANDBOX_ROUTE_VARIABLES.POOL_DATA]: PoolResolver,
            [SANDBOX_ROUTE_VARIABLES.POOL_REQUEST_DATA]: RequestResolver,
        },
        data: {
            title: 'Cleanup Request Stages',
        },
    },
    {
        path: `:${PATHS.SANDBOX.POOL_ID}/${PATHS.SANDBOX.SANDBOX_INSTANCE}/:${PATHS.SANDBOX.SANDBOX_INSTANCE_ID}/${PATHS.SANDBOX.TOPOLOGY}`,
        loadChildren: () =>
            import('@crczp/sandbox-agenda/topology').then((m) => m.SandboxTopologyComponent),
        resolve: {
            breadcrumb: SandboxInstanceBreadcrumbResolver,
            [PATHS.SANDBOX.SANDBOX_INSTANCE_ID]: SandboxInstanceResolver,
        },
        data: {
            title: 'Sandbox Topology',
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
export class PoolRoutingModule {
}
