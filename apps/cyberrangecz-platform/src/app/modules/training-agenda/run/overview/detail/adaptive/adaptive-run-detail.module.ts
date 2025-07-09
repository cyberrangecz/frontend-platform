import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveRunDetailRoutingModule} from './adaptive-run-detail-routing.module';
import {AdaptiveRunDetailComponent} from '@crczp/training-agenda/adaptive-run-detail';

@NgModule({
    imports: [
        CommonModule,
        AdaptiveRunDetailComponent,
        AdaptiveRunDetailRoutingModule,
    ],
})
export class AdaptiveRunDetailModule {
}
