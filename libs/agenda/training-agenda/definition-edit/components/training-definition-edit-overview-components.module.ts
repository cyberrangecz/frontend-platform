import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SentinelPipesModule} from '@sentinel/common/pipes';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {SentinelUserAssignComponent} from '@sentinel/components/user-assign';
import {TrainingAgendaConfig} from '@crczp/training-agenda';
import {TrainingDefinitionCanDeactivate} from '../services/can-deactivate/training-definition-can-deactivate.service';
import {
    TrainingDefinitionBreadcrumbResolver,
    TrainingDefinitionResolver,
    TrainingDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {TrainingDefinitionEditComponent} from './definition/training-definition-edit.component';
import {LevelOverviewComponentsModule} from './levels/level-overview-common.module';
import {TrainingDefinitionEditOverviewMaterialModule} from './training-definition-edit-overview-material.module';
import {TrainingDefinitionEditOverviewComponent} from './training-definition-edit-overview.component';
import {SentinelFreeFormComponent} from '@sentinel/components/free-form';

/**
 * Module containing components and providers of training definition detail/edt/new actions.
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        SentinelUserAssignComponent,
        TrainingDefinitionEditOverviewMaterialModule,
        LevelOverviewComponentsModule,
        SentinelPipesModule,
        ReactiveFormsModule,
        SentinelControlsComponent,
        SentinelFreeFormComponent,
    ],
    declarations: [
        TrainingDefinitionEditOverviewComponent,
        TrainingDefinitionEditComponent,
    ],
    providers: [
        TrainingDefinitionCanDeactivate,
        TrainingDefinitionResolver,
        TrainingDefinitionTitleResolver,
        TrainingDefinitionBreadcrumbResolver,
    ],
})
export class TrainingDefinitionEditOverviewComponentsModule {
    static forRoot(
        config: TrainingAgendaConfig
    ): ModuleWithProviders<TrainingDefinitionEditOverviewComponentsModule> {
        return {
            ngModule: TrainingDefinitionEditOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
