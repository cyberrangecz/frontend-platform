import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SentinelPipesModule} from '@sentinel/common/pipes';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {SentinelUserAssignComponent} from '@sentinel/components/user-assign';
import {TrainingAgendaConfig} from '@crczp/training-agenda';
import {AdaptiveDefinitionCanDeactivate} from '../services/can-deactivate/adaptive-definition-can-deactivate.service';
import {
    AdaptiveTrainingDefinitionEditComponent
} from './adaptive-definition/adaptive-training-definition-edit.component';
import {AdaptiveDefinitionEditOverviewMaterialModule} from './adaptive-definition-edit-overview-material.module';
import {AdaptiveDefinitionEditOverviewComponent} from './adaptive-definition-edit-overview.component';
import {SentinelFreeFormComponent} from '@sentinel/components/free-form';
import {PhaseOverviewComponentsModule} from './phases/phase-overview-common.module';
import {
    AdaptiveDefinitionBreadcrumbResolver,
    AdaptiveDefinitionResolver,
    AdaptiveDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {ModelSimulatorComponentWrapper} from './model-simulator/model-simulator-component-wrapper.component';

/**
 * Module containing components and providers of training definition detail/edt/new actions.
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelUserAssignComponent,
        AdaptiveDefinitionEditOverviewMaterialModule,
        SentinelPipesModule,
        ReactiveFormsModule,
        SentinelControlsComponent,
        SentinelFreeFormComponent,
        PhaseOverviewComponentsModule,
        ModelSimulatorModule,
    ],
    declarations: [
        AdaptiveDefinitionEditOverviewComponent,
        AdaptiveTrainingDefinitionEditComponent,
        ModelSimulatorComponentWrapper,
    ],
    providers: [
        AdaptiveDefinitionCanDeactivate,
        AdaptiveDefinitionResolver,
        AdaptiveDefinitionTitleResolver,
        AdaptiveDefinitionBreadcrumbResolver,
    ],
})
export class AdaptiveDefinitionEditOverviewComponentsModule {
    static forRoot(
        config: TrainingAgendaConfig
    ): ModuleWithProviders<AdaptiveDefinitionEditOverviewComponentsModule> {
        return {
            ngModule: AdaptiveDefinitionEditOverviewComponentsModule,
            providers: [{provide: TrainingAgendaConfig, useValue: config}],
        };
    }
}
