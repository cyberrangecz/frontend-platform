import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {AdaptiveInstanceResultsComponent} from '@crczp/training-agenda/adaptive-instance-results';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceResultsComponent,
    },
];

/**
 * Routing module for adaptive instance results
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceResultsRoutingModule {}
