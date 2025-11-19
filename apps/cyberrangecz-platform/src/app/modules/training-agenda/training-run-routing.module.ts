import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TrainingRunOverviewComponent } from '@crczp/training-agenda/run-overview';
import { AccessTrainingRunInfo, TrainingRun } from '@crczp/training-model';
import { TrainingApiModule } from '@crczp/training-api';
import { Routing, TrainingResolverHelperService, ValidRouterConfig } from '@crczp/routing-commons';

const routes: ValidRouterConfig<'run'> = [
    {
        path: '',
        component: TrainingRunOverviewComponent,
    },
    {
        path: 'adaptive/:runToken/access',
        loadComponent: () =>
            import('@crczp/training-agenda/run-detail').then(
                (m) => m.LinearTrainingRunDetailComponent,
            ),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: {
            [AccessTrainingRunInfo.name]:
                Routing.Resolvers.TrainingRun.resolveRunAccess,
        },
    },
    {
        path: 'adaptive/:runId/resume',
        loadComponent: () =>
            import('@crczp/training-agenda/run-detail').then(
                (m) => m.LinearTrainingRunDetailComponent,
            ),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: {
            [AccessTrainingRunInfo.name]:
                Routing.Resolvers.TrainingRun.resolveRunAccess,
        },
    },
    {
        path: 'linear/:runToken/access',
        loadComponent: () =>
            import('@crczp/training-agenda/run-detail').then(
                (m) => m.LinearTrainingRunDetailComponent,
            ),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: {
            [AccessTrainingRunInfo.name]:
                Routing.Resolvers.TrainingRun.resolveRunAccess,
        },
    },
    {
        path: 'adaptive/:runId/resume',
        loadComponent: () =>
            import('@crczp/training-agenda/run-detail').then(
                (m) => m.LinearTrainingRunDetailComponent,
            ),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: {
            [AccessTrainingRunInfo.name]:
                Routing.Resolvers.TrainingRun.resolveRunAccess,
        },
    },
    {
        path: 'linear/:runId/results',
        loadComponent: () =>
            import('@crczp/training-agenda/run-results').then(
                (m) => m.TrainingRunResultsComponent,
            ),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: {
            [TrainingRun.name]:
                Routing.Resolvers.TrainingRun.resolveAccessedTrainingRunResults,
        },
    },
    {
        path: 'adaptive/:runId/results',
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-run-results').then(
                (m) => m.AdaptiveRunResultsComponent,
            ),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: {
            [TrainingRun.name]:
                Routing.Resolvers.TrainingRun.resolveAccessedTrainingRunResults,
        },
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        TrainingApiModule,
        TrainingRunOverviewComponent,
    ],
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class TrainingRunRoutingModule {}
