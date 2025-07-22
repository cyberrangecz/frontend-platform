import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {PoolOverviewComponent} from '@crczp/sandbox-agenda/pool-overview';
import {Routing, ValidRouterConfig} from "@crczp/common";
import {AllocationRequest, CleanupRequest, Pool} from '@crczp/sandbox-model';

const routes: ValidRouterConfig<'pool'> = [
    {
        path: '',
        component: PoolOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-edit').then((m) => m.PoolEditComponent),
        resolve: {
            breadcrumb: Routing.Resolvers.Pool.resolvePoolBreadcrumb,
        },
        data: {
            title: 'Create Pool',
        },
    },
    {
        path: ':poolId/edit',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-edit').then((m) => m.PoolEditComponent),
        resolve: {
            breadcrumb: Routing.Resolvers.Pool.resolvePoolBreadcrumb,
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
        },
        data: {
            title: 'Edit Pool',
        },
    },
    {
        path: ':poolId',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-detail').then((m) => m.PoolDetailComponent),
        resolve: {
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
            breadcrumb: Routing.Resolvers.Pool.resolvePoolBreadcrumb,
            subtitle: Routing.Resolvers.Pool.resolvePoolComment
        },
        data: {
            title: 'Pool Detail',
        },

    },
    {
        path: ':poolId/sandbox-instance/:sandboxInstanceId',
        loadChildren: () =>
            import('@crczp/sandbox-agenda/request-detail').then((m) => m.AllocationRequestDetailComponent),
        resolve: {
            breadcrumb: Routing.Resolvers.Sandbox.resolveSandboxBreadcrumb,
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
            [AllocationRequest.name]: Routing.Resolvers.Sandbox.resolveSandbox
        },
        data: {
            title: 'Allocation Request Stages',
        },
    },
    {
        path: ':poolId/sandbox-instance/:sandboxInstanceId/cleanup',
        loadChildren: () =>
            import('@crczp/sandbox-agenda/request-detail').then((m) => m.CleanupRequestDetailComponent),
        resolve: {
            breadcrumb: Routing.Resolvers.Sandbox.resolveSandboxBreadcrumb,
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
            [CleanupRequest.name]: Routing.Resolvers.Sandbox.resolveSandbox
        },
        data: {
            title: 'Cleanup Request Stages',
        },
    },
    {
        path: ':poolId/sandbox-instance/:sandboxInstanceId/topology',
        loadChildren: () =>
            import('@crczp/sandbox-agenda/topology').then((m) => m.SandboxTopologyComponent),
        resolve: {
            breadcrumb: Routing.Resolvers.Sandbox.resolveSandboxBreadcrumb,
            [AllocationRequest.name]: Routing.Resolvers.Sandbox.resolveSandbox
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
