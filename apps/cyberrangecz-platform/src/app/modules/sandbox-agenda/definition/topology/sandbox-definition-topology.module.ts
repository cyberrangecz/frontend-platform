import {NgModule} from '@angular/core';
import {SandboxDefinitionTopologyRoutingModule} from './sandbox-definition-topology-routing.module';
import {SandboxTopologyComponent} from "@crczp/sandbox-agenda/topology";

@NgModule({
    imports: [
        SandboxTopologyComponent,
        SandboxDefinitionTopologyRoutingModule,
    ],
})
export class SandboxDefinitionTopologyModule {
}
