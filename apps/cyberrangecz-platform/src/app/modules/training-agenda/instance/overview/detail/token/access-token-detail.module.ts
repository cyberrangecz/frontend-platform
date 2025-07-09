import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {AccessTokenDetailRoutingModule} from './access-token-detail-routing.module';
import {AccessTokenDetailComponent} from "@crczp/training-agenda/instance-access-token";

@NgModule({
    imports: [
        CommonModule,
        AccessTokenDetailComponent,
        AccessTokenDetailRoutingModule,
    ],
})
export class AccessTokenDetailModule {
}
