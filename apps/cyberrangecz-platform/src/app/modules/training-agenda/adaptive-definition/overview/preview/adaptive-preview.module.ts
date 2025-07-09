import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AdaptivePreviewRoutingModule} from './adaptive-preview-routing.module';
import {AdaptivePreviewComponent} from "@crczp/training-agenda/adaptive-definition-preview";

@NgModule({
    imports: [
        CommonModule,
        AdaptivePreviewComponent,
        AdaptivePreviewRoutingModule,
    ],
})
export class AdaptivePreviewModule {
}
