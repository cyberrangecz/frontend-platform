import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {AdaptiveDefinitionOverviewComponent} from '@crczp/training-agenda/adaptive-definition-overview';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {TrainingApiModule} from '@crczp/training-api';
import {AdaptiveDefinitionCanDeactivate} from '@crczp/training-agenda/adaptive-definition-edit';
import {Routing, ValidRouterConfig} from "@crczp/common";
import {TrainingDefinition} from "@crczp/training-model";
import Resolvers = Routing.Resolvers;

const routes: ValidRouterConfig<'adaptive-definition'> = [
    {
        path: '',
        component: AdaptiveDefinitionOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-edit').then(
                (m) => m.AdaptiveDefinitionEditOverviewComponent
            ),
        resolve: {
            [TrainingDefinition.name]: Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Resolvers.TrainingDefinition.linearDefinitionBreadcrumbResolver,
            title: Resolvers.TrainingDefinition.linearDefinitionTitleResolver,
        },
        canDeactivate: [AdaptiveDefinitionCanDeactivate],
    },
    {
        path: ':definitionId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-edit').then(
                (m) => m.AdaptiveDefinitionEditOverviewComponent
            ),
        resolve: {
            [TrainingDefinition.name]: Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Resolvers.TrainingDefinition.adaptiveDefinitionBreadcrumbResolver,
            title: Resolvers.TrainingDefinition.linearDefinitionTitleResolver
        },
        canDeactivate: [AdaptiveDefinitionCanDeactivate],
    },
    {
        path: ':definitionId/preview',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-preview').then(
                (m) => m.AdaptivePreviewComponent
            ),
        data: {
            title: undefined,
        },
        resolve: {
            [TrainingDefinition.name]: Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Resolvers.TrainingDefinition.adaptiveDefinitionBreadcrumbResolver,
        },
    },
    {
        path: ':definitionId/detail',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-summary').then(
                (m) => m.AdaptiveDefinitionSummaryComponent
            ),
        resolve: {
            [TrainingDefinition.name]: Resolvers.TrainingDefinition.linearDefinitionResolver,
            breadcrumb: Resolvers.TrainingDefinition.adaptiveDefinitionBreadcrumbResolver,
            title: Resolvers.TrainingDefinition.linearDefinitionTitleResolver
        },
    },
    {
        path: ':definitionId/simulator',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-simulator').then(
                (m) => m.AdaptiveDefinitionSimulatorComponent
            ),
        data: {
            title: 'Adaptive Model Simulating Tool',
        },
        resolve: {
            breadcrumb: Resolvers.TrainingDefinition.adaptiveDefinitionBreadcrumbResolver,
        },
    },
];

/**
 * Routing module adaptive definition overview
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SandboxApiModule,
        TrainingApiModule,
    ],
    exports: [RouterModule],
})
export class AdaptiveDefinitionRoutingModule {
}
