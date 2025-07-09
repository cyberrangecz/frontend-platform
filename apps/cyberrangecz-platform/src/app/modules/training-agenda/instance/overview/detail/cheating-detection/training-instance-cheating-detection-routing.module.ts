import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    CHEATING_DETECTION_CREATE_PATH,
    CHEATING_DETECTION_EVENTS_PATH,
    TRAINING_INSTANCE_SELECTOR,
} from '@crczp/training-agenda';
import {CheatingDetectionOverviewComponent} from '@crczp/training-agenda/instance-cheating-detection';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: CheatingDetectionOverviewComponent,
    },
    {
        path: CHEATING_DETECTION_CREATE_PATH,
        loadChildren: () =>
            import('./cheating-detection-create/cheating-detection-create.module').then(
                (m) => m.CheatingDetectionCreateOverviewModule,
            ),
        data: {
            title: 'Create Cheating Detection',
            breadcrumb: 'Create',
        },
    },
    {
        path: `:${TRAINING_INSTANCE_SELECTOR}/${CHEATING_DETECTION_EVENTS_PATH}`,
        loadChildren: () =>
            import('./detection-event/training-instance-detection-event.module').then(
                (m) => m.TrainingInstanceDetectionEventModule,
            ),
        data: {
            title: 'Detection Events',
            breadcrumb: 'Events',
        },
    },
];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CheatingDetectionOverviewRoutingModule {}
