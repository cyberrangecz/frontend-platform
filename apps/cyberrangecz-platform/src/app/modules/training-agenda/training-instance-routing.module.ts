import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TrainingApiModule } from '@crczp/training-api';
import { SandboxApiModule } from '@crczp/sandbox-api';
import { TrainingInstanceOverviewComponent } from '@crczp/training-agenda/instance-overview';
import { TrainingInstance } from '@crczp/training-model';
import { Routing, TrainingResolverHelperService, ValidRouterConfig } from '@crczp/routing-commons';
import { canDeactivateTrainingInstance } from '@crczp/training-agenda/instance-edit';

const routes: ValidRouterConfig<'linear-instance'> = [
    {
        path: '',
        component: TrainingInstanceOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then(
                (m) => m.LinearTrainingInstanceEditOverviewComponent,
            ),
        canDeactivate: [canDeactivateTrainingInstance],
        resolve: {
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
    },
    {
        path: ':instanceId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then(
                (m) => m.LinearTrainingInstanceEditOverviewComponent,
            ),
        canDeactivate: [canDeactivateTrainingInstance],
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
    },
    {
        path: ':instanceId/progress',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-progress').then(
                (m) => m.TrainingInstanceProgressComponent,
            ),
    },
    {
        path: ':instanceId/detail',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-summary').then(
                (m) => m.TrainingInstanceSummaryComponent,
            ),
    },
    {
        path: ':instanceId/results',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/instance-results').then(
                (m) => m.TrainingInstanceResultsRoutingModule,
            ),
    },
    {
        path: ':instanceId/access-token',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-access-token').then(
                (m) => m.AccessTokenDetailComponent,
            ),
    },
    {
        path: ':instanceId/cheating-detection',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadChildren: () =>
            import(
                './training-instance-cheating-detection-routing.module'
            ).then((m) => m.CheatingDetectionOverviewRoutingModule),
    },
    {
        path: ':instanceId/runs',
        resolve: {
            [TrainingInstance.name]:
                Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb:
                Routing.Resolvers.TrainingInstance
                    .linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance
                .linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-runs').then(
                (m) => m.TrainingInstanceRunsComponent,
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
export class TrainingInstanceRoutingModule {}
