import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CheatingDetectionOverviewComponent } from '@crczp/training-agenda/instance-cheating-detection';
import {
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'linear-instance/:instanceId/cheating-detection'> =
    [
        {
            path: '',
            pathMatch: 'full',
            component: CheatingDetectionOverviewComponent,
        },
        {
            path: 'create',
            loadComponent: () =>
                import(
                    '@crczp/training-agenda/instance-cheating-detection-edit'
                ).then((m) => m.CheatingDetectionEditComponent),
            data: {
                title: 'Create Cheating Detection',
                breadcrumb: 'Create',
            },
        },
        {
            path: ':detectionId',
            loadComponent: () =>
                import('@crczp/training-agenda/instance-detection-event').then(
                    (m) => m.TrainingInstanceDetectionEventComponent,
                ),
            data: {
                title: 'Cheating Detection Detail',
                breadcrumb: 'Detection',
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
                breadcrumb: 'Event',
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
