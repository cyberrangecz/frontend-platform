import {NgModule} from '@angular/core';
import {AdaptiveDefinitionDetailRoutingModule} from './adaptive-definition-detail-routing.module';
import {AdaptiveDefinitionDetailComponentsModule} from "@crczp/training-agenda/definition-detail";

@NgModule({
    imports: [
        AdaptiveDefinitionDetailComponentsModule,
        AdaptiveDefinitionDetailRoutingModule,
    ],
})
export class AdaptiveDefinitionDetailModule {
}
