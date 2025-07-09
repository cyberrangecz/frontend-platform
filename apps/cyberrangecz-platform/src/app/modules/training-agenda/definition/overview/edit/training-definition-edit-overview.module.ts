import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingDefinitionEditOverviewComponent} from '@crczp/training-agenda/definition-edit';
import {TrainingDefinitionEditOverviewRoutingModule} from './training-definition-edit-overview-routing.module';

@NgModule({
    imports: [
        CommonModule,
        TrainingDefinitionEditOverviewComponent,
        TrainingDefinitionEditOverviewRoutingModule,
    ],
})
export class TrainingDefinitionEditOverviewModule {
}
