import {RouterModule, Routes} from '@angular/router';
import {
    ACCESS_TOKEN_PATH,
    ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME,
    PROGRESS_PATH,
    RESULTS_PATH,
    RUNS_PATH,
    SUMMARY_PATH,
} from '@crczp/training-agenda';
import {NgModule} from '@angular/core';
import {
    AdaptiveInstanceDetailBreadcrumbResolver,
    AdaptiveInstanceDetailTitleResolver,
    AdaptiveInstanceResolver,
} from '@crczp/training-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: SUMMARY_PATH,
    },
    {
        path: SUMMARY_PATH,
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('./summary/adaptive-instance-summary.module').then((m) => m.AdaptiveInstanceSummaryModule),
    },
    {
        path: RESULTS_PATH,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('./results/adaptive-instance-results.module').then((m) => m.AdaptiveInstanceResultsModule),
    },
    {
        path: PROGRESS_PATH,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('./progress/adaptive-instance-progress.module').then((m) => m.AdaptiveInstanceProgressModule),
    },
    {
        path: ACCESS_TOKEN_PATH,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('./token/adaptive-access-token-detail.module').then((m) => m.AdaptiveAccessTokenDetailModule),
    },
    {
        path: RUNS_PATH,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () => import('./runs/adaptive-instance-runs.module').then((m) => m.AdaptiveInstanceRunsModule),
    },
];

/**
 * Routing module for training instance detail module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceDetailRoutingModule {}
