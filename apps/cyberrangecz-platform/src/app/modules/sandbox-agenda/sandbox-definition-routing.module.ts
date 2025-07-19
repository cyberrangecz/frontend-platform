import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SANDBOX_ROUTE_VARIABLES} from '@crczp/sandbox-agenda';
import {SandboxDefinitionOverviewComponent} from '@crczp/sandbox-agenda/sandbox-definition-overview';
import {SandboxDefinitionBreadcrumbResolver, SandboxDefinitionResolver} from '@crczp/sandbox-agenda/resolvers';
import {PATHS} from "../../paths";

const routes: Routes = [
    {
        path: '',
        component: SandboxDefinitionOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadChildren: () =>
            import('@crczp/sandbox-agenda/sandbox-definition-edit').then((m) => m.SandboxDefinitionEditComponent),
        data: {
            breadcrumb: 'Create',
            title: 'Create Sandbox Definition',
        },
    },
    {
        path: `:${PATHS.SANDBOX.DEFINITION_ID}/${PATHS.SANDBOX.TOPOLOGY}`,
        loadChildren: () =>
            import('@crczp/sandbox-agenda/topology').then((m) => m.SandboxTopologyComponent),
        resolve: {
            breadcrumb: SandboxDefinitionBreadcrumbResolver,
            [SANDBOX_ROUTE_VARIABLES.SANDBOX_DEFINITION_DATA]: SandboxDefinitionResolver,
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
export class SandboxDefinitionRoutingModule {
}
