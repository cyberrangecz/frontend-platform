import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelStepperModule } from '@sentinel/components/stepper';
import { AdaptiveRunDetailMaterialModule } from './adaptive-run-detail-material.module';
import { AdaptiveRunDetailComponent } from './adaptive-run-detail.component';
import { PhaseComponentsModule } from './phase/phase-components.module';
import { SentinelUserCardModule } from '@sentinel/layout/user-card';

/**
 * Contains all components of adaptive run detail
 */
@NgModule({
    imports: [
        CommonModule,
        AdaptiveRunDetailMaterialModule,
        PhaseComponentsModule,
        RouterModule,
        SentinelPipesModule,
        SentinelStepperModule,
        SentinelUserCardModule,
    ],
    declarations: [AdaptiveRunDetailComponent],
    exports: [AdaptiveRunDetailComponent],
})
export class AdaptiveRunDetailComponentsModule {}
