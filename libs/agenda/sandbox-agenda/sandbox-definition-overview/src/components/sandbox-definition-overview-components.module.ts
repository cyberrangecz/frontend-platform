import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { SandboxAgendaConfig, SandboxDefaultNavigator, SandboxNavigator } from '@crczp/sandbox-agenda';
import {
    DefaultPaginationService,
    SandboxAgendaContext,
    SandboxDefinitionOverviewConcreteService,
    SandboxDefinitionOverviewService,
} from '@crczp/sandbox-agenda/internal';
import { SandboxDefinitionDetailComponent } from 'libs/agenda/sandbox-agenda/sandbox-definition-overview/src/components/sandbox-definition-detail/sandbox-definition-detail.component';
import { SandboxDefinitionOverviewComponent } from 'libs/agenda/sandbox-agenda/sandbox-definition-overview/src/components/sandbox-definition-overview.component';
import { SandboxDefinitionBreadcrumbResolver, SandboxDefinitionResolver } from '@crczp/sandbox-agenda/resolvers';

/**
 * Module containing components and services for sandbox definition overview page
 */
@NgModule({
    imports: [CommonModule, SentinelTableModule, SentinelControlsComponent],
    declarations: [SandboxDefinitionOverviewComponent, SandboxDefinitionDetailComponent],
    providers: [
        DefaultPaginationService,
        SandboxAgendaContext,
        SandboxDefinitionResolver,
        SandboxDefinitionBreadcrumbResolver,
        { provide: SandboxDefinitionOverviewService, useClass: SandboxDefinitionOverviewConcreteService },
        { provide: SandboxNavigator, useClass: SandboxDefaultNavigator },
    ],
})
export class SandboxDefinitionOverviewComponentsModule {
    static forRoot(config: SandboxAgendaConfig): ModuleWithProviders<SandboxDefinitionOverviewComponentsModule> {
        return {
            ngModule: SandboxDefinitionOverviewComponentsModule,
            providers: [{ provide: SandboxAgendaConfig, useValue: config }],
        };
    }
}
