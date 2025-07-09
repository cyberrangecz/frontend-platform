import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrainingRunDetailComponent, TrainingRunLevelsDeactivateGuard} from '@crczp/training-agenda/run-detail';

const routes: Routes = [
    {
        path: '',
        component: TrainingRunDetailComponent,
        canDeactivate: [TrainingRunLevelsDeactivateGuard],
    },
];

/**
 * Routing for training run detail module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingRunDetailRoutingModule {}
