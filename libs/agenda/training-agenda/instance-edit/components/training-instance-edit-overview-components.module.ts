import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { SentinelPipesModule } from '@sentinel/common/pipes';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelListComponent, SentinelListElementDirective } from '@sentinel/components/list';
import { SentinelUserAssignComponent } from '@sentinel/components/user-assign';
import { TrainingAgendaConfig } from '@crczp/training-agenda';
import { TrainingInstanceCanDeactivate } from '../services/can-deactivate/training-instance-can-deactivate.service';
import { TrainingInstanceEditOverviewMaterialModule } from './training-instance-edit-overview-material.module';
import { TrainingInstanceEditOverviewComponent } from './training-instance-edit-overview.component';
import { TrainingInstanceEditComponent } from './training-instance-edit/training-instance-edit.component';
import { SentinelResourceSelectorModule } from '@sentinel/components/resource-selector';

/**
 * Main module of training instance edit components and providers
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SentinelUserAssignComponent,
        RouterModule,
        SentinelListComponent,
        SentinelPipesModule,
        TrainingInstanceEditOverviewMaterialModule,
        OwlDateTimeModule,
        OwlNativeDateTimeModule,
        SentinelControlsComponent,
        SentinelListElementDirective,
        SentinelResourceSelectorModule,
    ],
    declarations: [TrainingInstanceEditOverviewComponent, TrainingInstanceEditComponent],
    providers: [TrainingInstanceCanDeactivate],
})
export class TrainingInstanceEditOverviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingInstanceEditOverviewComponentsModule> {
        return {
            ngModule: TrainingInstanceEditOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
