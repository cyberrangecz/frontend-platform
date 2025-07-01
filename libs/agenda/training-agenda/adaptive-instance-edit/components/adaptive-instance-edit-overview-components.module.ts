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
import { AdaptiveInstanceEditComponent } from './adaptive-instance-edit/adaptive-instance-edit.component';
import { AdaptiveInstanceEditOverviewMaterialModule } from './adaptive-instance-edit-overview-material.module';
import { AdaptiveInstanceEditOverviewComponent } from './adaptive-instance-edit-overview.component';
import { AdaptiveInstanceCanDeactivate } from '../services/can-deactivate/adaptive-instance-can-deactivate.service';
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
        AdaptiveInstanceEditOverviewMaterialModule,
        OwlDateTimeModule,
        OwlNativeDateTimeModule,
        SentinelControlsComponent,
        SentinelListElementDirective,
        SentinelResourceSelectorModule,
    ],
    declarations: [AdaptiveInstanceEditOverviewComponent, AdaptiveInstanceEditComponent],
    providers: [AdaptiveInstanceCanDeactivate],
})
export class AdaptiveInstanceEditOverviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveInstanceEditOverviewComponentsModule> {
        return {
            ngModule: AdaptiveInstanceEditOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
