import {RouterModule} from '@angular/router';
import {NgModule} from '@angular/core';
import {AdaptiveInstanceOverviewComponent} from '@crczp/training-agenda/adaptive-instance-overview';
import {TrainingApiModule} from "@crczp/training-api";
import {SandboxApiModule} from "@crczp/sandbox-api";
import {AdaptiveInstanceCanDeactivate} from "@crczp/training-agenda/adaptive-instance-edit";
import {Routing, ValidRouterConfig} from "@crczp/common";
import {TrainingInstance} from '@crczp/training-model';

const routes: ValidRouterConfig<'adaptive-instance'> = [
    {
        path: '',
        component: AdaptiveInstanceOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
        canDeactivate: [AdaptiveInstanceCanDeactivate],
    },
    {
        path: ':instanceId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
        canDeactivate: [AdaptiveInstanceCanDeactivate],
    },
    {
        path: ':instanceId/access-token',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-access-token').then((m) => m.AccessTokenDetailComponent),
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
    },
    {
        path: ':instanceId/detail',
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-summary').then((m) => m.AdaptiveInstanceSummaryComponent),
    },
    {
        path: ':instanceId/results',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-results').then((m) => m.AdaptiveInstanceResultsComponent),
    },
    {
        path: ':instanceId/progress',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
        },
        loadChildren: () =>
            import('@crczp/training-agenda/adaptive-instance-progress').then((m) => m.AdaptiveInstanceProgressComponent),
    },
    {
        path: ':instanceId/runs',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.adaptiveInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.adaptiveInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.adaptiveInstanceTitleResolver
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
