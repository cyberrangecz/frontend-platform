import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AdaptiveDefinitionOverviewComponent } from '@crczp/training-agenda/adaptive-definition-overview';
import { SandboxApiModule } from '@crczp/sandbox-api';
import { TrainingApiModule } from '@crczp/training-api';
import { AdaptiveDefinitionCanDeactivate } from '@crczp/training-agenda/adaptive-definition-edit';
import { TrainingDefinition } from '@crczp/training-model';
import {
    Routing,
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

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
            [TrainingDefinition.name]:
                Routing.Resolvers.TrainingDefinition.adaptiveDefinitionResolver,
            breadcrumb:
                Routing.Resolvers.TrainingDefinition
                    .adaptiveDefinitionBreadcrumbResolver,
            title: Routing.Resolvers.TrainingDefinition
                .adaptiveDefinitionTitleResolver,
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
            [TrainingDefinition.name]:
                Routing.Resolvers.TrainingDefinition.adaptiveDefinitionResolver,
            breadcrumb:
                Routing.Resolvers.TrainingDefinition
                    .adaptiveDefinitionBreadcrumbResolver,
            title: Routing.Resolvers.TrainingDefinition
                .adaptiveDefinitionTitleResolver,
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
            [TrainingDefinition.name]:
                Routing.Resolvers.TrainingDefinition.adaptiveDefinitionResolver,
            breadcrumb:
                Routing.Resolvers.TrainingDefinition
                    .adaptiveDefinitionBreadcrumbResolver,
        },
    },
    {
        path: ':definitionId/detail',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-summary').then(
                (m) => m.AdaptiveDefinitionSummaryComponent
            ),
        resolve: {
            [TrainingDefinition.name]:
                Routing.Resolvers.TrainingDefinition.adaptiveDefinitionResolver,
            breadcrumb:
                Routing.Resolvers.TrainingDefinition
                    .adaptiveDefinitionBreadcrumbResolver,
            title: Routing.Resolvers.TrainingDefinition
                .adaptiveDefinitionTitleResolver,
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
            breadcrumb:
                Routing.Resolvers.TrainingDefinition
                    .adaptiveDefinitionBreadcrumbResolver,
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
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class AdaptiveDefinitionRoutingModule {}
