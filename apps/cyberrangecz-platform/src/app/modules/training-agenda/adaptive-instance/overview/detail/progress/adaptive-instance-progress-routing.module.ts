import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdaptiveInstanceProgressComponent} from '@crczp/training-agenda/adaptive-instance-progress';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceProgressComponent,
    },
];

/**
 * Routing module for adaptive instance progress
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceProgressRoutingModule {}
