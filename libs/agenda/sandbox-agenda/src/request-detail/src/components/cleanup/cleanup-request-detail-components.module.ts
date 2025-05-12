import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SandboxAgendaConfig } from '@crczp/sandbox-agenda';
import { RequestDetailComponentsModule } from '../request-detail-components.module';
import { CleanupRequestDetailComponent } from './cleanup-request-detail.component';

@NgModule({
    declarations: [CleanupRequestDetailComponent],
    imports: [CommonModule, RequestDetailComponentsModule],
})
export class CleanupRequestDetailComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<CleanupRequestDetailComponentsModule> {
        return {
            ngModule: CleanupRequestDetailComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
