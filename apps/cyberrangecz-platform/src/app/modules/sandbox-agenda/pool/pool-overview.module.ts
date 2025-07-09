import {NgModule} from '@angular/core';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {SandboxAgendaSharedProvidersModule} from '../sandbox-agenda-shared-providers.module';
import {PoolOverviewRoutingModule} from './pool-overview-routing.module';
import {PoolOverviewComponent} from "@crczp/sandbox-agenda/pool-overview";

@NgModule({
    imports: [
        SandboxAgendaSharedProvidersModule,
        SandboxApiModule,
        PoolOverviewComponent,
        PoolOverviewRoutingModule,
    ],
})
export class PoolOverviewModule {
}
