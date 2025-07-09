import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    SANDBOX_DEFINITION_ID_SELECTOR,
    SANDBOX_DEFINITION_NEW_PATH,
    SANDBOX_TOPOLOGY_PATH,
} from '@crczp/sandbox-agenda';
import {SandboxDefinitionOverviewComponent} from '@crczp/sandbox-agenda/sandbox-definition-overview';
import {SandboxDefinitionBreadcrumbResolver} from '@crczp/sandbox-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: SandboxDefinitionOverviewComponent,
    },
    {
        path: SANDBOX_DEFINITION_NEW_PATH,
        loadChildren: () => import('./edit/sandbox-definition-edit.module').then((m) => m.SandboxDefinitionEditModule),
        data: {
            breadcrumb: 'Create',
            title: 'Create Sandbox Definition',
        },
    },
    {
        path: `:${SANDBOX_DEFINITION_ID_SELECTOR}/${SANDBOX_TOPOLOGY_PATH}`,
        loadChildren: () =>
            import('./topology/sandbox-definition-topology.module').then((m) => m.SandboxDefinitionTopologyModule),
        resolve: {
            breadcrumb: SandboxDefinitionBreadcrumbResolver,
        },
        data: {
            title: 'Sandbox Definition Topology',
        },
    },
];

/**
 * Sandbox definition overview routing
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SandboxDefinitionOverviewRoutingModule {}
