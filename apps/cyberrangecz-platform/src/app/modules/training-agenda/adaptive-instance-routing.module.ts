import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { AdaptiveInstanceOverviewComponent } from '@crczp/training-agenda/adaptive-instance-overview';
import { TrainingApiModule } from '@crczp/training-api';
import { SandboxApiModule } from '@crczp/sandbox-api';
import { TrainingInstance } from '@crczp/training-model';
import { Routing, TrainingResolverHelperService, ValidRouterConfig } from '@crczp/routing-commons';
import { canDeactivateTrainingInstance } from '@crczp/training-agenda/instance-edit';

const routes: ValidRouterConfig<'adaptive-instance'> = [
    {
        path: '',
        component: AdaptiveInstanceOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then(
                (m) => m.AdaptiveTrainingInstanceEditOverviewComponent,
            ),
        resolve: {
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        canDeactivate: [canDeactivateTrainingInstance],
    },
    {
        path: ':instanceId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then(
                (m) => m.AdaptiveTrainingInstanceEditOverviewComponent,
            ),
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        canDeactivate: [canDeactivateTrainingInstance],
    },
    {
        path: ':instanceId/access-token',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-access-token').then(
                (m) => m.AccessTokenDetailComponent,
            ),
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
    },
    {
        path: ':instanceId/detail',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-summary').then(
                (m) => m.AdaptiveInstanceSummaryComponent,
            ),
    },
    {
        path: ':instanceId/results',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-results').then(
                (m) => m.AdaptiveInstanceResultsComponent,
            ),
    },
    {
        path: ':instanceId/progress',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-progress').then(
                (m) => m.AdaptiveInstanceProgressComponent,
            ),
    },
    {
        path: ':instanceId/runs',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .adaptiveInstanceTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-runs').then(
                (m) => m.AdaptiveInstanceRunsComponent,
            ),
    },
];

/**
 * Routing for training instance module
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        TrainingApiModule,
        SandboxApiModule,
    ],
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class AdaptiveInstanceRoutingModule {}
