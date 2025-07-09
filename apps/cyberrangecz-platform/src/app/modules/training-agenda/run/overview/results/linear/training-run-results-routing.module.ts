import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TrainingRunResultsComponent} from '@crczp/training-agenda/run-results';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: TrainingRunResultsComponent,
    },
];

/**
 * Module containing routing for training run results module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingRunResultsRoutingModule {}
