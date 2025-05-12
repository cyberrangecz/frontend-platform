import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDividerModule } from '@angular/material/divider';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { LevelEditComponentsModule } from './level/level-edit-components.module';
import { LevelOverviewComponent } from './overview/level-overview.component';
import { TrainingLevelStepperComponent } from './stepper/training-level-stepper.component';
import { ngfModule } from 'angular-file';
import { TrainingDefinitionEditOverviewMaterialModule } from '../training-definition-edit-overview-material.module';

/**
 * Module containing component and providers for training definition levels' overview
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelPipesModule,
        LevelEditComponentsModule,
        ReactiveFormsModule,
        SentinelStepperModule,
        MatDividerModule,
        SentinelControlsComponent,
        TrainingDefinitionEditOverviewMaterialModule,
        ngfModule,
    ],
    declarations: [TrainingLevelStepperComponent, LevelOverviewComponent],
    exports: [LevelOverviewComponent],
})
export class LevelOverviewComponentsModule {}
