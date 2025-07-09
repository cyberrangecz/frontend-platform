import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CHEATING_DETECTION_EVENT_DETAIL_PATH, DETECTION_EVENT_SELECTOR} from '@crczp/training-agenda';
import {TrainingInstanceDetectionEventComponent} from '@crczp/training-agenda/instance-detection-event';

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceDetectionEventComponent,
    },
    {
        path: `:${DETECTION_EVENT_SELECTOR}/${CHEATING_DETECTION_EVENT_DETAIL_PATH}`,
        loadChildren: () =>
            import('./detection-event-detail/training-instance-detection-event-detail.module').then(
                (m) => m.TrainingInstanceDetectionEventDetailModule,
            ),
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
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceDetectionEventRoutingModule {}
