import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {TrainingDefinitionSummaryComponent} from '@crczp/training-agenda/definition-summary';

const routes: Routes = [
    {
        path: '',
        component: TrainingDefinitionSummaryComponent,
    },
];

/**
 * Routing module for training definition summary
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingDefinitionSummaryRoutingModule {}
