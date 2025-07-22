import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {SandboxDefinitionOverviewComponent} from "@crczp/sandbox-agenda/sandbox-definition-overview";
import {Routing, ValidRouterConfig} from "@crczp/common";
import {SandboxDefinition} from "@crczp/sandbox-model";
import Resolvers = Routing.Resolvers;

const routes: ValidRouterConfig<'sandbox-definition'> = [
    {
        path: '',
        component: SandboxDefinitionOverviewComponent,
    },
    {
        path: 'create',
        loadChildren: () =>
            import('@crczp/sandbox-agenda/sandbox-definition-edit').then((m) => m.SandboxDefinitionEditComponent),
        data: {
            breadcrumb: 'Create',
            title: 'Create Sandbox Definition',
        },
    },
    {
        path: ':definitionId/topology',
        loadChildren: () =>
            import('@crczp/sandbox-agenda/topology').then((m) => m.SandboxTopologyComponent),
        resolve: {
            breadcrumb: Resolvers.SandboxDefinition.resolveSandboxDefinitionBreadcrumb,
            [SandboxDefinition.name]: Resolvers.SandboxDefinition.resolveSandboxDefinition,
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
