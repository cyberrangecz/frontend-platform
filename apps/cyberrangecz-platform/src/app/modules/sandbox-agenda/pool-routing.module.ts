import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PoolOverviewComponent } from '@crczp/sandbox-agenda/pool-overview';
import { Request } from '@crczp/sandbox-model';
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
        data: {
            title: 'Create Pool',
            breadcrumb: 'Create',
        },
    },
    {
        path: ':poolId/edit',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-edit').then(
                (m) => m.PoolEditComponent,
            ),
        resolve: Routing.Resolvers.resolvePool({
            title: 'Edit Pool {id}',
            breadcrumb: 'Edit',
        }),
    },
    {
        path: ':poolId',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/pool-detail').then(
                (m) => m.PoolDetailComponent,
            ),
        resolve: Routing.Resolvers.resolvePool({
            title: 'Pool {id}',
            breadcrumb: '{id}',
        }),
    },
    {
        path: ':poolId/sandbox-instance/:requestId',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/request-detail').then(
                (m) => m.AllocationRequestDetailComponent,
            ),
        resolve: {
            [Request.name]: Routing.Resolvers.resolveSandbox,
        },
        data: {
            title: 'Allocation Request Stages',
            breadcrumb: 'Allocation Request',
        },
    },
    {
        path: ':poolId/sandbox-instance/:sandboxInstanceId/topology',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/sandbox-topology').then(
                (m) => m.SandboxTopologyComponent,
            ),
        data: {
            title: 'Sandbox Topology',
            breadcrumb: 'Sandbox Topology',
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
