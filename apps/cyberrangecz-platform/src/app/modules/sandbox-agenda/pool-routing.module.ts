import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PoolOverviewComponent } from '@crczp/sandbox-agenda/pool-overview';
import { Pool, Request } from '@crczp/sandbox-model';
import { SandboxApiModule } from '@crczp/sandbox-api';
import {
    Routing,
    SandboxResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'pool'> = [
    {
        path: '',
        component: PoolOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-edit').then(
                (m) => m.PoolEditComponent,
            ),
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
            import('@crczp/sandbox-agenda/pool-edit').then(
                (m) => m.PoolEditComponent,
            ),
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
            import('@crczp/sandbox-agenda/pool-detail').then(
                (m) => m.PoolDetailComponent,
            ),
        resolve: {
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
            breadcrumb: Routing.Resolvers.Pool.resolvePoolBreadcrumb,
            subtitle: Routing.Resolvers.Pool.resolvePoolComment,
        },
        data: {
            title: 'Pool Detail',
        },
    },
    {
        path: ':poolId/sandbox-instance/:requestId',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/request-detail').then(
                (m) => m.AllocationRequestDetailComponent,
            ),
        resolve: {
            breadcrumb: Routing.Resolvers.Sandbox.resolveSandboxBreadcrumb,
            [Pool.name]: Routing.Resolvers.Pool.resolvePool,
            [Request.name]: Routing.Resolvers.Sandbox.resolveSandbox,
        },
        data: {
            title: 'Allocation Request Stages',
        },
    },
    {
        path: ':poolId/sandbox-instance/:sandboxInstanceId/topology',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/sandbox-topology').then(
                (m) => m.SandboxTopologyComponent,
            ),
        resolve: {
            breadcrumb: Routing.Resolvers.Sandbox.resolveSandboxBreadcrumb,
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
    imports: [RouterModule.forChild(routes), SandboxApiModule],
    providers: [SandboxResolverHelperService],
    exports: [RouterModule],
})
export class PoolRoutingModule {}
