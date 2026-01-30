import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CheatingDetectionOverviewComponent } from '@crczp/training-agenda/instance-cheating-detection';
import {
    Routing,
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'linear-instance/:instanceId/cheating-detection'> =
    [
        {
            path: '',
            pathMatch: 'full',
            component: CheatingDetectionOverviewComponent,
            resolve: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: 'create',
            loadComponent: () =>
                import(
                    '@crczp/training-agenda/instance-cheating-detection-edit'
                ).then((m) => m.CheatingDetectionEditComponent),
            resolve: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: ':detectionId',
            loadComponent: () =>
                import('@crczp/training-agenda/instance-detection-event').then(
                    (m) => m.TrainingInstanceDetectionEventComponent,
                ),
            resolve: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: `:detectionId/event/:eventId`,
            loadComponent: () =>
                import(
                    '@crczp/training-agenda/instance-detection-event-detail'
                ).then((m) => m.TrainingInstanceDetectionEventDetailComponent),
            data: {
                title: 'Detection Event Detail',
                breadcrumb: 'Detail',
            },
        },
    ];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        CheatingDetectionOverviewComponent,
    ],
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class CheatingDetectionOverviewRoutingModule {}
