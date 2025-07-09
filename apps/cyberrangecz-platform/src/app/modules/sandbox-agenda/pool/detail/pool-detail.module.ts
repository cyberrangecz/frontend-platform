import {NgModule} from '@angular/core';
import {PoolDetailComponent} from '@crczp/sandbox-agenda/pool-detail';
import {PoolDetailRoutingModule} from './pool-detail-routing.module';

@NgModule({
    imports: [PoolDetailComponent, PoolDetailRoutingModule],
})
export class PoolDetailModule {
}
