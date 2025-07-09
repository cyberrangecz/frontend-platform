import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrainingInstanceRunsComponent} from '@crczp/training-agenda/instance-runs';

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceRunsComponent,
    },
];

/**
 * Routing module for training instance runs
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceRunsRoutingModule {}
