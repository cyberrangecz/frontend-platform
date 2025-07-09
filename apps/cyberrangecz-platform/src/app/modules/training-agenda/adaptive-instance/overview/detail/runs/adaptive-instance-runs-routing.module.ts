import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdaptiveInstanceRunsComponent} from '@crczp/training-agenda/adaptive-instance-runs';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceRunsComponent,
    },
];

/**
 * Routing module for training instance runs
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceRunsRoutingModule {}
