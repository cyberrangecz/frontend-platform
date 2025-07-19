import {RouterModule, Routes} from '@angular/router';
import {ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME, PATHS,} from '@crczp/training-agenda';
import {NgModule} from '@angular/core';
import {
    AdaptiveInstanceBreadcrumbResolver,
    AdaptiveInstanceDetailBreadcrumbResolver,
    AdaptiveInstanceDetailTitleResolver,
    AdaptiveInstanceResolver,
    AdaptiveInstanceTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {AdaptiveInstanceOverviewComponent} from '@crczp/training-agenda/adaptive-instance-overview';
import {TrainingApiModule} from "@crczp/training-api";
import {SandboxApiModule} from "@crczp/sandbox-api";
import {AdaptiveInstanceCanDeactivate} from "@crczp/training-agenda/adaptive-instance-edit";

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
        canDeactivate: [AdaptiveInstanceCanDeactivate],
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.ACTION.EDIT}`,
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
        canDeactivate: [AdaptiveInstanceCanDeactivate],
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.ACESS_TOKEN}`,
        loadComponent: () =>
            import('@crczp/training-agenda/instance-access-token').then((m) => m.AccessTokenDetailComponent),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.SUMMARY}`,
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-summary').then((m) => m.AdaptiveInstanceSummaryComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.RESULTS}`,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-results').then((m) => m.AdaptiveInstanceResultsComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.PROGRESS}`,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-progress').then((m) => m.AdaptiveInstanceProgressComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.RUNS}`,
        resolve: {
            trainingInstance: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceDetailBreadcrumbResolver,
            title: AdaptiveInstanceDetailTitleResolver,
        },
        loadChildren: () => import('@crczp/training-agenda/adaptive-instance-runs').then((m) => m.AdaptiveInstanceRunsComponent),
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
    exports: [RouterModule],
})
export class AdaptiveInstanceRoutingModule {
}
