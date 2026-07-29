import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SandboxDefinitionOverviewComponent } from '@crczp/sandbox-agenda/sandbox-definition-overview';
import { SandboxApiModule } from '@crczp/sandbox-api';
import {
    Routing,
    SandboxResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'sandbox-definition'> = [
    {
        path: '',
        component: SandboxDefinitionOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/sandbox-definition-edit').then(
                (m) => m.SandboxDefinitionEditComponent
            ),
        data: {
            breadcrumb: 'Create',
            title: 'Create Sandbox Definition',
        },
    },
    {
        path: ':definitionId/topology',
        loadComponent: () =>
            import('@crczp/sandbox-agenda/sandbox-topology').then(
                (m) => m.SandboxTopologyComponent
            ),
        resolve: Routing.Resolvers.resolveSandboxDefinition({
            title: 'Topology of {title}',
            breadcrumb: 'Topology',
        }),
    },
];

/**
 * Sandbox definition overview routing
 */
@NgModule({
    imports: [RouterModule.forChild(routes), SandboxApiModule],
    providers: [SandboxResolverHelperService],
    exports: [RouterModule],
})
export class SandboxDefinitionRoutingModule {}
