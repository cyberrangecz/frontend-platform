import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { PhaseOverviewComponent } from './overview/phase-overview.component';
import { PhaseStepperComponent } from './stepper/phase-stepper.component';
import { PhaseEditComponentsModule } from './phase/phase-edit-components.module';

/**
 * Module containing component and providers for training-training-phase definition levels' overview
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelPipesModule,
        PhaseEditComponentsModule,
        ReactiveFormsModule,
        SentinelStepperModule,
        MatDividerModule,
        SentinelControlsComponent,
    ],
    declarations: [PhaseStepperComponent, PhaseOverviewComponent],
    exports: [PhaseOverviewComponent],
})
export class PhaseOverviewComponentsModule {}
