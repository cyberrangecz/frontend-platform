import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CheatingDetectionOverviewComponent } from '@crczp/training-agenda/instance-cheating-detection';
import {
    Routing,
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';
import { TrainingApiModule } from '@crczp/training-api';

const routes: ValidRouterConfig<'linear-instance/:instanceId/cheating-detection'> =
    [
        {
            path: '',
            pathMatch: 'full',
            component: CheatingDetectionOverviewComponent,
            data: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: 'create',
            loadChildren: () =>
                import(
                    '@crczp/training-agenda/instance-cheating-detection-edit'
                ).then((m) => m.CheatingDetectionEditComponent),
            data: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: ':eventId',
            loadChildren: () =>
                import('@crczp/training-agenda/instance-detection-event').then(
                    (m) => m.TrainingInstanceDetectionEventComponent
                ),
            data: {
                title: Routing.Resolvers.CheatingDetection
                    .resolveCheatingDetectionTitle,
                breadcrumb:
                    Routing.Resolvers.CheatingDetection
                        .resolveCheatingDetectionBreadcrumb,
            },
        },
        {
            path: `:eventId/detail`,
            loadChildren: () =>
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
        TrainingApiModule,
        CheatingDetectionOverviewComponent,
    ],
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class CheatingDetectionOverviewRoutingModule {}
