import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SandboxAgendaConfig } from '@crczp/sandbox-agenda';
import { RequestDetailComponentsModule } from '../request-detail-components.module';
import { AllocationRequestDetailComponent } from './allocation-request-detail.component';

@NgModule({
    declarations: [AllocationRequestDetailComponent],
    imports: [CommonModule, RequestDetailComponentsModule],
})
export class AllocationRequestDetailComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<AllocationRequestDetailComponentsModule> {
        return {
            ngModule: AllocationRequestDetailComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
