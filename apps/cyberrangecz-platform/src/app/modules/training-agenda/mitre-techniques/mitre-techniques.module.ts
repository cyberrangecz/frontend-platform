import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {TrainingApiModule} from '@crczp/training-api';
import {TrainingAgendaSharedProvidersModule} from '../training-agenda-shared-providers.module';
import {MitreTechniquesRoutingModule} from './mitre-techniques-routing.module';
import {MitreTechniquesComponent} from "@crczp/training-agenda/mitre-techniques";

@NgModule({
    imports: [
        CommonModule,
        TrainingAgendaSharedProvidersModule,
        MitreTechniquesComponent,
        TrainingApiModule,
        MitreTechniquesRoutingModule,
    ],
})
export class MitreTechniquesModule {
}
