import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {AdaptiveDefinitionSummaryComponent} from '@crczp/training-agenda/adaptive-definition-summary';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveDefinitionSummaryComponent,
    },
];

/**
 * Routing module for adaptive definition summary
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveDefinitionSummaryRoutingModule {}
