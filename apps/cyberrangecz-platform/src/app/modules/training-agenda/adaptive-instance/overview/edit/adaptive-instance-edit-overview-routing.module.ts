import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {
    AdaptiveInstanceCanDeactivate,
    AdaptiveInstanceEditOverviewComponent,
} from '@crczp/training-agenda/adaptive-instance-edit';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceEditOverviewComponent,
        canDeactivate: [AdaptiveInstanceCanDeactivate],
    },
];

/**
 * Routing module for adaptive instance edit module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceEditOverviewRoutingModule {}
