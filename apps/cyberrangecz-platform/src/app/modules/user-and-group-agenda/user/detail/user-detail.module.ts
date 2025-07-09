import {NgModule} from '@angular/core';
import {GroupDetailRoutingModule} from './user-detail-routing.module';
import {UserAndGroupSharedProvidersModule} from '../../user-and-group-shared-providers.module';
import {CommonModule} from '@angular/common';
import {UserDetailComponent} from "@crczp/user-and-group-agenda/user-detail";

@NgModule({
    imports: [CommonModule, UserAndGroupSharedProvidersModule, GroupDetailRoutingModule, UserDetailComponent],
})
export class UserDetailModule {
}
