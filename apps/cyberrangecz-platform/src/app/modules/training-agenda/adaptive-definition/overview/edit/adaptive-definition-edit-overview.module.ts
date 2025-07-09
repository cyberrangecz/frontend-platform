import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveDefinitionEditOverviewComponent} from '@crczp/training-agenda/adaptive-definition-edit';
import {AdaptiveDefinitionEditOverviewRoutingModule} from './adaptive-definition-edit-overview-routing.module';

@NgModule({
    imports: [
        CommonModule,
        AdaptiveDefinitionEditOverviewComponent,
        AdaptiveDefinitionEditOverviewRoutingModule,
    ],
})
export class AdaptiveDefinitionEditOverviewModule {
}
