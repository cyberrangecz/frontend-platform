import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdaptiveRunResultsComponent} from '@crczp/training-agenda/adaptive-run-results';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        component: AdaptiveRunResultsComponent,
    },
];

/**
 * Module containing routing for adaptive run results module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveRunResultsRoutingModule {}
