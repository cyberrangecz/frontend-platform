import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrainingInstanceProgressComponent} from '@crczp/training-agenda/instance-progress';

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceProgressComponent,
    },
];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceProgressRoutingModule {}
