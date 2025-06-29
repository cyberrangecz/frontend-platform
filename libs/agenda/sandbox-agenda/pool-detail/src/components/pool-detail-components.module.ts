import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {SandboxAgendaConfig} from '@crczp/sandbox-agenda';
import {
    RequestBreadcrumbResolver,
    RequestResolver,
    SandboxInstanceBreadcrumbResolver,
    SandboxInstanceResolver,
} from '@crczp/sandbox-agenda/resolvers';
import {EditableCommentComponent} from '@crczp/sandbox-agenda/internal';
import {PoolDetailComponent} from "./pool-detail.component";
import {PoolDetailMaterialModule} from "./pool-detail-material.module";
import {StageOverviewComponent} from "./stage-overview/stage-overview.component";
import {
    AllocateVariableSandboxesDialogComponent
} from "./allocate-variable-sandboxes/allocate-variable-sandboxes-dialog.component";
import {SentinelTable} from "@sentinel/components/table";


/**
 * Module containing component and providers for sandbox pool detail page
 */
@NgModule({
    declarations: [PoolDetailComponent, StageOverviewComponent, AllocateVariableSandboxesDialogComponent],
    imports: [
        CommonModule,
        SentinelTable,
        PoolDetailMaterialModule,
        SentinelControlsComponent,
        EditableCommentComponent,
    ],
    providers: [RequestResolver, RequestBreadcrumbResolver, SandboxInstanceResolver, SandboxInstanceBreadcrumbResolver],
})
export class PoolDetailComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<PoolDetailComponentsModule> {
        return {
            ngModule: PoolDetailComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
