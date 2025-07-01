import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { CheatingDetectionEditComponent } from './cheating-detection-edit.component';
import { SentinelFreeFormComponent } from '@sentinel/components/free-form';
import { ReactiveFormsModule } from '@angular/forms';
import { CheatingDetectionOverviewComponentsModule } from '@crczp/training-agenda/instance-cheating-detection';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { CheatingDetectionEditService } from '../services/cheating-detection-edit.service';
import { CheatingDetectionEditConcreteService } from '../services/cheating-detection-edit-concrete.service';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { CheatingDetectionEditMaterialModule } from './cheating-detection-edit-material.module';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatExpansionModule } from '@angular/material/expansion';

@NgModule({
    imports: [
        CommonModule,
        SentinelFreeFormComponent,
        ReactiveFormsModule,
        CheatingDetectionEditMaterialModule,
        SentinelControlsComponent,
        MatExpansionModule,
        MatRadioModule,
        MatButtonModule,
    ],
    declarations: [CheatingDetectionEditComponent],
    providers: [{ provide: CheatingDetectionEditService, useClass: CheatingDetectionEditConcreteService }],
})
export class TrainingInstanceCheatingDetectionEditComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<CheatingDetectionOverviewComponentsModule> {
        return {
            ngModule: TrainingInstanceCheatingDetectionEditComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
