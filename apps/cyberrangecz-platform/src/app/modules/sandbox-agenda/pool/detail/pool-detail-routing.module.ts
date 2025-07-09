import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    POOL_ALLOCATION_REQUEST_PATH,
    POOL_CLEANUP_REQUEST_PATH,
    POOL_DATA_ATTRIBUTE_NAME,
    POOL_REQUEST_ID_SELECTOR,
    SANDBOX_INSTANCE_ID_SELECTOR,
    SANDBOX_INSTANCE_PATH,
    SANDBOX_TOPOLOGY_PATH,
} from '@crczp/sandbox-agenda';
import {PoolDetailComponent} from '@crczp/sandbox-agenda/pool-detail';
import {
    PoolResolver,
    RequestBreadcrumbResolver,
    SandboxInstanceBreadcrumbResolver,
} from '@crczp/sandbox-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: PoolDetailComponent,
        resolve: {
            [POOL_DATA_ATTRIBUTE_NAME]: PoolResolver,
        },
    },
    {
        path: `${SANDBOX_INSTANCE_PATH}/:${SANDBOX_INSTANCE_ID_SELECTOR}/${SANDBOX_TOPOLOGY_PATH}`,
        loadChildren: () =>
            import('./sandbox-instance/sandbox-instance-topology.module').then((m) => m.SandboxInstanceTopologyModule),
        resolve: {
            breadcrumb: SandboxInstanceBreadcrumbResolver,
        },
        data: {
            title: 'Sandbox Topology',
        },
    },
    {
        path: `${POOL_ALLOCATION_REQUEST_PATH}/:${POOL_REQUEST_ID_SELECTOR}`,
        loadChildren: () =>
            import('./request/allocation-request-detail.module').then((m) => m.AllocationRequestDetailModule),
        resolve: {
            breadcrumb: RequestBreadcrumbResolver,
        },
        data: {
            title: 'Allocation Request Stages',
        },
    },
    {
        path: `${POOL_CLEANUP_REQUEST_PATH}/:${POOL_REQUEST_ID_SELECTOR}`,
        loadChildren: () => import('./request/cleanup-request-detail.module').then((m) => m.CleanupRequestDetailModule),
        resolve: {
            breadcrumb: RequestBreadcrumbResolver,
        },
        data: {
            title: 'Cleanup Request Stages',
        },
    },
];

/**
 * Routing for pool detail module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class PoolDetailRoutingModule {}
