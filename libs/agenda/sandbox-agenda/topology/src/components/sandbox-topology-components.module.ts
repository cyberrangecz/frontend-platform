import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { TopologyGraphConfig, TopologyGraphModule, TopologyLegendModule } from '@crczp/topology-graph';
import { SandboxAgendaConfig } from '@crczp/sandbox-agenda';
import { SandboxTopologyComponent } from 'libs/agenda/sandbox-agenda/topology/src/components/sandbox-topology.component';

/**
 * Module containing components and providers for sandbox instance topology page
 */
@NgModule({
    declarations: [SandboxTopologyComponent],
    imports: [CommonModule, MatCardModule, TopologyGraphModule, TopologyLegendModule],
})
export class SandboxTopologyComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<SandboxTopologyComponentsModule> {
        return {
            ngModule: SandboxTopologyComponentsModule,
            providers: [
                { provide: TopologyGraphConfig, useValue: config.topologyConfig },
                { provide: SandboxAgendaConfig, useValue: config },
            ],
        };
    }
}
