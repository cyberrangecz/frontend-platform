import {NgModule} from '@angular/core';
import {SandboxInstanceTopologyRoutingModule} from './sandbox-instance-topology-routing.module';
import {SandboxTopologyComponent} from "@crczp/sandbox-agenda/topology";

@NgModule({
    imports: [
        SandboxTopologyComponent,
        SandboxInstanceTopologyRoutingModule,
    ],
})
export class SandboxInstanceTopologyModule {
}
