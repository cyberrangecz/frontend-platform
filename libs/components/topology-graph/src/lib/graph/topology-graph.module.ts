import {
    ModuleWithProviders,
    NgModule,
    Optional,
    SkipSelf,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyGraphComponent } from './topology-graph.component';
import { TopologyApi } from '../services/topology-api.service';
import { GraphVisualComponentsModule } from '../visuals/graph-visual-components.module';
import { GraphMaterialModule } from './graph-material.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TopologyGraphConfig } from '../others/topology-graph-config';
import { ConfigService } from '../services/config.service';
import { TopologyMapper } from '../services/topology-mapper.service';
import { TopologyLoadingService } from '../services/topology-loading.service';
import { TopologyErrorService } from '../services/topology-error.service';
import { LogoSpinnerComponent } from '@crczp/components-common';
import { SandboxService } from '../services/sandbox.service';
import { HostService } from '../services/host.service';
import { D3Service } from '../services/d3.service';
import { ContextMenuService } from '../services/context-menu.service';
import { GraphEventService } from '../services/graph-event.service';
import { GraphLockService } from '../services/graph-lock.service';
import { DraggedNodeService } from '../services/dragged-node.service';
import { ResourcePollingService } from '../services/resource-polling.service';
import { TopologyLegendComponent } from '../legend/topology-legend.component';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        GraphMaterialModule,
        GraphVisualComponentsModule,
        LogoSpinnerComponent,
        TopologyLegendComponent
    ],
    declarations: [TopologyGraphComponent],
    providers: [
        ConfigService,
        TopologyApi,
        TopologyMapper,
        TopologyLoadingService,
        TopologyErrorService,
        SandboxService,
        HostService,
        D3Service,
        ContextMenuService,
        GraphEventService,
        GraphLockService,
        DraggedNodeService,
        ResourcePollingService,
    ],
    exports: [TopologyGraphComponent],
})
export class TopologyGraphModule {
    constructor(@Optional() @SkipSelf() parentModule: TopologyGraphModule) {
        if (parentModule) {
            throw new Error(
                'TopologyGraphModule is already loaded. Import it in the main module only'
            );
        }
    }

    static forRoot(
        config: TopologyGraphConfig
    ): ModuleWithProviders<TopologyGraphModule> {
        return {
            ngModule: TopologyGraphModule,
            providers: [{ provide: TopologyGraphConfig, useValue: config }],
        };
    }
}
