import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { MitreTechniquesOverviewConcreteService } from '../services/mitre-techniques-concrete.service';
import { MitreTechniquesOverviewService } from '../services/mitre-techniques.service';
import { MitreTechniquesMaterialModule } from './mitre-techniques-material.module';
import { MitreTechniquesComponent } from './mitre-techniques.component';
import { SafeHtmlPipe } from './safe-html.pipe';

/**
 * Components and providers for mitre techniques.
 */
@NgModule({
    imports: [CommonModule, RouterModule, MitreTechniquesMaterialModule],
    declarations: [MitreTechniquesComponent, SafeHtmlPipe],
    providers: [{ provide: MitreTechniquesOverviewService, useClass: MitreTechniquesOverviewConcreteService }],
})
export class MitreTechniquesComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<MitreTechniquesComponentsModule> {
        return {
            ngModule: MitreTechniquesComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
