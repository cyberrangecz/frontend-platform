import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {TrainingApiModule} from "@crczp/training-api";
import {SandboxApiModule} from "@crczp/sandbox-api";
import {TrainingInstanceCanDeactivate} from "@crczp/training-agenda/instance-edit";
import {TrainingInstanceOverviewComponent} from "@crczp/training-agenda/instance-overview";
import {Routing, ValidRouterConfig} from "@crczp/common";
import {TrainingInstance} from '@crczp/training-model';

const routes: ValidRouterConfig<'linear-instance'> = [
    {
        path: '',
        component: TrainingInstanceOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
            canDeactivate: [TrainingInstanceCanDeactivate],
        },
    },
    {
        path: ':instanceId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/instance-edit').then((m) => m.TrainingInstanceEditOverviewComponent),
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
            canDeactivate: [TrainingInstanceCanDeactivate],
        },
    },
    {
        path: ':instanceId/progress',
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-progress').then((m) => m.TrainingInstanceProgressComponent),
    },
    {
        path: ':instanceId/detail',
        resolve: {
            [TrainingInstance.name]: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-summary').then((m) => m.TrainingInstanceSummaryComponent),
    },
    {
        path: ':instanceId/results',
        pathMatch: 'prefix',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
        },
        loadComponent: () =>
            import('@crczp/training-agenda/instance-results').then((m) => m.TrainingInstanceResultsComponent),
    },
    {
        path: ':instanceId/access-token',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
        },
        loadComponent: () => import('@crczp/training-agenda/instance-access-token').then(
            (m) => m.AccessTokenDetailComponent
        ),
    },
    {
        path: ':instanceId/runs',
        resolve: {
            trainingInstance: Routing.Resolvers.TrainingInstance.linearInstanceResolver,
            breadcrumb: Routing.Resolvers.TrainingInstance.linearInstanceBreadcrumbResolver,
            title: Routing.Resolvers.TrainingInstance.linearInstanceTitleResolver,
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
