import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {MitreTechniquesRoutingModule} from './mitre-techniques-routing.module';
import {MitreTechniquesComponent} from "@crczp/training-agenda/mitre-techniques";

@NgModule({
    imports: [
        CommonModule,
        MitreTechniquesComponent,
        MitreTechniquesRoutingModule,
    ],
})
export class MitreTechniquesModule {
}
