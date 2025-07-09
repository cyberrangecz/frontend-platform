import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AdaptiveAccessTokenDetailRoutingModule} from './adaptive-access-token-detail-routing.module';
import {AccessTokenDetailComponent} from "@crczp/training-agenda/instance-access-token";

@NgModule({
    imports: [
        CommonModule,
        AccessTokenDetailComponent,
        AdaptiveAccessTokenDetailRoutingModule,
    ],
})
export class AdaptiveAccessTokenDetailModule {
}
