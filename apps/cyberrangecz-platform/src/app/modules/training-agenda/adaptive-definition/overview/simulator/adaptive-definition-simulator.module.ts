import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AdaptiveDefinitionSimulatorRoutingModule} from './adaptive-definition-simulator-routing.module';
import {AdaptiveDefinitionSimulatorComponent} from "@crczp/training-agenda/adaptive-definition-simulator";

@NgModule({
    imports: [
        CommonModule,
        AdaptiveDefinitionSimulatorComponent,
        AdaptiveDefinitionSimulatorRoutingModule,
    ],
})
export class AdaptiveDefinitionSimulatorModule {
}
