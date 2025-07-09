import {NgModule} from '@angular/core';
import {TrainingDefinitionDetailRoutingModule} from './training-definition-detail-routing.module';
import {
    TrainingDefinitionDetailComponent
} from "../../../../../../../../../libs/agenda/training-agenda/definition-overview/components/detail/training-definition-detail.component";

@NgModule({
    imports: [
        TrainingDefinitionDetailComponent,
        TrainingDefinitionDetailRoutingModule,
    ],
})
export class TrainingDefinitionDetailModule {
}
