import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {AdaptiveInstanceSummaryComponent} from '@crczp/training-agenda/adaptive-instance-summary';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceSummaryComponent,
    },
];

/**
 * Routing module for adaptive instance summary
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceSummaryRoutingModule {}
