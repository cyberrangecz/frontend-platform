import {NgModule} from '@angular/core';
import {PoolEditRoutingModule} from './pool-edit-routing.module';
import {PoolEditComponent} from "@crczp/sandbox-agenda/pool-edit";

@NgModule({
    imports: [PoolEditComponent, PoolEditRoutingModule],
})
export class PoolEditModule {
}
