import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelListComponent, SentinelListElementDirective } from '@sentinel/components/list';
import { SandboxAgendaConfig } from '@crczp/sandbox-agenda';
import { PoolEditConcreteService } from 'libs/agenda/sandbox-agenda/pool-edit/src/services/pool-edit-concrete.service';
import { PoolEditService } from 'libs/agenda/sandbox-agenda/pool-edit/src/services/pool-edit.service';
import { SandboxDefinitionSelectComponent } from 'libs/agenda/sandbox-agenda/pool-edit/src/components/sandbox-definition-select/sandbox-definition-select.component';
import { PoolEditMaterialModule } from 'libs/agenda/sandbox-agenda/pool-edit/src/components/pool-edit-material.module';
import { PoolEditComponent } from 'libs/agenda/sandbox-agenda/pool-edit/src/components/pool-edit.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatGridListModule } from '@angular/material/grid-list';
import { SentinelResourceSelectorModule } from '@sentinel/components/resource-selector';
import { MatExpansionPanelTitle } from '@angular/material/expansion';

@NgModule({
    declarations: [PoolEditComponent, SandboxDefinitionSelectComponent],
    imports: [
        CommonModule,
        PoolEditMaterialModule,
        SentinelControlsComponent,
        SentinelListComponent,
        ReactiveFormsModule,
        MatTooltipModule,
        MatGridListModule,
        SentinelListElementDirective,
        SentinelResourceSelectorModule,
        MatExpansionPanelTitle,
    ],
    providers: [{ provide: PoolEditService, useClass: PoolEditConcreteService }],
})
export class PoolEditComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<PoolEditComponentsModule> {
        return {
            ngModule: PoolEditComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
