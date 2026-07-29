import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TrainingApiModule } from '@crczp/training-api';
import { SandboxApiModule } from '@crczp/sandbox-api';
import {
    ScoreCsvExportService,
    TrainingInstanceOverviewComponent,
} from '@crczp/training-agenda/instance-overview';
import { provideDataBroker, provideEntityResolverService } from '@crczp/event-query-engine';
import {
    Routing,
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';
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
        data: { title: 'Create Training Instance', breadcrumb: 'Create' },
    },
    {
        path: ':instanceId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then(
                (m) => m.LinearTrainingInstanceEditOverviewComponent,
            ),
        canDeactivate: [canDeactivateTrainingInstance],
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Edit {title}',
            breadcrumb: '{title}',
        }),
    },
    {
        path: ':instanceId/detail',
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Detail of {title}',
            breadcrumb: 'Detail',
        }),
        loadComponent: () =>
            import('@crczp/training-agenda/instance-summary').then(
                (m) => m.TrainingInstanceSummaryComponent,
            ),
    },
    {
        path: ':instanceId/results',
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Results of {title}',
            breadcrumb: 'Results',
        }),
        loadComponent: () =>
            import('@crczp/training-agenda/instance-results').then(
                (m) => m.AnalysisDashboardComponent,
            ),
    },
    {
        path: ':instanceId/access-token',
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Access Token of {title}',
            breadcrumb: 'Access Token',
        }),
        loadComponent: () =>
            import('@crczp/training-agenda/instance-access-token').then(
                (m) => m.AccessTokenDetailComponent,
            ),
    },
    {
        path: ':instanceId/cheating-detection',
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Cheating Detections of {title}',
            breadcrumb: '{title}',
        }),
        loadChildren: () =>
            import(
                './training-instance-cheating-detection-routing.module'
            ).then((m) => m.CheatingDetectionOverviewRoutingModule),
    },
    {
        path: ':instanceId/runs',
        resolve: Routing.Resolvers.resolveTrainingInstance({
            title: 'Training Runs of {title}',
            breadcrumb: 'Training Runs',
        }),
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
    providers: [
        TrainingResolverHelperService,
        provideDataBroker(),
        provideEntityResolverService(),
        ScoreCsvExportService,
    ],
    exports: [RouterModule],
})
export class TrainingInstanceRoutingModule {}
