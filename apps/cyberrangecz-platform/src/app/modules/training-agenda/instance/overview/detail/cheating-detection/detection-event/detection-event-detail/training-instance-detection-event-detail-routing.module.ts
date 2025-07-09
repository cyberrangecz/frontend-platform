import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrainingInstanceDetectionEventDetailComponent} from '@crczp/training-agenda/instance-detection-event-detail';

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceDetectionEventDetailComponent,
    },
];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceDetectionEventDetailRoutingModule {}
