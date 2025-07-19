import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PATHS, TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME,} from '@crczp/training-agenda';
import {
    TrainingInstanceBreadcrumbResolver,
    TrainingInstanceDetailBreadcrumbResolver,
    TrainingInstanceDetailTitleResolver,
    TrainingInstanceResolver,
    TrainingInstanceTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {TrainingApiModule} from "@crczp/training-api";
import {SandboxApiModule} from "@crczp/sandbox-api";
import {TrainingInstanceCanDeactivate} from "@crczp/training-agenda/instance-edit";
import {TrainingInstanceOverviewComponent} from "@crczp/training-agenda/instance-overview";

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceBreadcrumbResolver,
            title: TrainingInstanceTitleResolver,
            canDeactivate: [TrainingInstanceCanDeactivate],
        },
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.ACTION.EDIT}`,
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceBreadcrumbResolver,
            title: TrainingInstanceTitleResolver,
            canDeactivate: [TrainingInstanceCanDeactivate],
        },
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.PROGRESS}`,
        resolve: {
            [TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceDetailBreadcrumbResolver,
            title: TrainingInstanceDetailTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-progress').then((m) => m.TrainingInstanceProgressComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.VIEW.SUMMARY}`,
        resolve: {
            [TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceDetailBreadcrumbResolver,
            title: TrainingInstanceDetailTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-summary').then((m) => m.TrainingInstanceSummaryComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.RESULTS}`,
        pathMatch: 'prefix',
        resolve: {
            trainingInstance: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceDetailBreadcrumbResolver,
            title: TrainingInstanceDetailTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-results').then((m) => m.TrainingInstanceResultsComponent),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.ACESS_TOKEN}`,
        resolve: {
            trainingInstance: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceDetailBreadcrumbResolver,
            title: TrainingInstanceDetailTitleResolver,
        },
        loadComponent: () => import('@crczp/training-agenda/instance-access-token').then(
            (m) => m.AccessTokenDetailComponent
        ),
    },
    {
        path: `:${PATHS.INSTANCE.ATTRIBUTE.ID}/${PATHS.INSTANCE.RUNS}`,
        resolve: {
            trainingInstance: TrainingInstanceResolver,
            breadcrumb: TrainingInstanceDetailBreadcrumbResolver,
            title: TrainingInstanceDetailTitleResolver,
        },
        loadComponent: () => import('@crczp/training-agenda/instance-runs').then((m) => m.TrainingInstanceRunsComponent),
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
export class TrainingInstanceRoutingModule {
}
