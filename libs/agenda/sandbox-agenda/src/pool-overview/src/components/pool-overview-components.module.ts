import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { SandboxAgendaConfig, SandboxDefaultNavigator, SandboxNavigator } from '@crczp/sandbox-agenda';
import {
    DefaultPaginationService,
    ResourcePollingService,
    SandboxAgendaContext,
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import { PoolBreadcrumbResolver, PoolCommentResolver, PoolResolver } from '@crczp/sandbox-agenda/resolvers';
import { PoolOverviewComponent } from './pool-overview.component';
import { AbstractPoolService } from '../services/abstract-pool/abstract-sandbox/abstract-pool.service';
import { AbstractPoolConcreteService } from '../services/abstract-pool/abstract-sandbox/abstract-pool-concrete.service';
import { PoolOverviewService } from '../services/state/pool-overview/pool-overview.service';
import { PoolOverviewConcreteService } from '../services/state/pool-overview/pool-overview-concrete.service';
import {
    SandboxAllocationUnitsConcreteService,
    SandboxAllocationUnitsService,
    SandboxInstanceConcreteService,
    SandboxInstanceService,
} from '@crczp/sandbox-agenda/pool-detail';
import { PoolOverviewMaterialModule } from './pool-overview-material.module';
import { PoolExpandDetailComponent } from './pool-expand-detail/pool-expand-detail.component';
import { ResourceBarComponent } from './pool-expand-detail/resource-bar/resource-bar.component';
import { SandboxResourcesConcreteService } from '../services/resources/sandbox-resources-concrete.service';
import { SandboxResourcesService } from '../services/resources/sandbox-resources.service';
import { QuotasComponent } from './quotas/quotas.component';
import { QuotaPieChartComponent } from './quotas/quota-pie-chart/quota-pie-chart.component';
import { MatCardModule } from '@angular/material/card';
import { EditableCommentComponent } from '@crczp/sandbox-agenda/internal';
import { TableStateCellComponent } from './table-state-cell/table-state-cell.component';

/**
 * Module containing components and providers for sandbox pool overview page
 */
@NgModule({
    declarations: [
        PoolOverviewComponent,
        PoolExpandDetailComponent,
        ResourceBarComponent,
        QuotasComponent,
        QuotaPieChartComponent,
        TableStateCellComponent,
    ],
    imports: [
        CommonModule,
        SentinelTableModule,
        SentinelControlsComponent,
        PoolOverviewMaterialModule,
        MatCardModule,
        EditableCommentComponent,
    ],
    providers: [
        PoolResolver,
        DefaultPaginationService,
        PoolBreadcrumbResolver,
        PoolCommentResolver,
        SandboxAgendaContext,
        ResourcePollingService,
        { provide: SandboxNavigator, useClass: SandboxDefaultNavigator },
        { provide: PoolOverviewService, useClass: PoolOverviewConcreteService },
        { provide: SandboxInstanceService, useClass: SandboxInstanceConcreteService },
        { provide: SandboxAllocationUnitsService, useClass: SandboxAllocationUnitsConcreteService },
        { provide: AbstractPoolService, useClass: AbstractPoolConcreteService },
        { provide: SandboxDefinitionOverviewService, useClass: SandboxDefinitionOverviewConcreteService },
        { provide: SandboxResourcesService, useClass: SandboxResourcesConcreteService },
    ],
})
export class PoolOverviewComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<PoolOverviewComponentsModule> {
        return {
            ngModule: PoolOverviewComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
