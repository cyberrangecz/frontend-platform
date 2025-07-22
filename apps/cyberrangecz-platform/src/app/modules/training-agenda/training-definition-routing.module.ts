import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {TrainingDefinitionOverviewComponent} from '@crczp/training-agenda/definition-overview';
import {SandboxApiModule} from "@crczp/sandbox-api";
import {TrainingApiModule} from "@crczp/training-api";
import {TrainingDefinitionCanDeactivate} from "@crczp/training-agenda/definition-edit";
import {Routing, ValidRouterConfig} from "@crczp/common";
import {TrainingDefinition} from "@crczp/training-model";

const routes: ValidRouterConfig<'linear-definition'> = [
    {
        path: '',
        component: TrainingDefinitionOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [TrainingDefinitionCanDeactivate],
    },
    {
        path: ':definitionId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [TrainingDefinitionCanDeactivate],
    },
    {
        path: ':definitionId/preview',
        loadComponent: () => import('@crczp/training-agenda/definition-preview').then(
            (m) => m.TrainingPreviewComponent
        ),
        data: {
            title: undefined,
        },
        resolve: {
            [TrainingDefinition.name]: Routing.Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Routing.Resolvers.TrainingDefinition.linearDefinitionBreadcrumbResolver,
        },
    },
    {
        path: ':definitionId/detail',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-summary').then(
                (m) => m.TrainingDefinitionSummaryComponent
            ),
        resolve: {
            [TrainingDefinition.name]: Routing.Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Routing.Resolvers.TrainingDefinition.linearDefinitionBreadcrumbResolver,
            title: Routing.Resolvers.TrainingDefinition.linearDefinitionTitleResolver,
        },
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SandboxApiModule,
        TrainingApiModule,
    ],
    exports: [RouterModule],
})
export class TrainingDefinitionRoutingModule {
}
