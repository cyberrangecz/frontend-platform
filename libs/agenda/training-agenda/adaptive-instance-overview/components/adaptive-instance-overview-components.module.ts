import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { SentinelTableModule } from '@sentinel/components/table';
import { TrainingAgendaConfig, TrainingDefaultNavigator, TrainingNavigator } from '@crczp/training-agenda';
import { DefaultPaginationService, TrainingAgendaContext } from '@crczp/training-agenda/internal';
import {
    AdaptiveInstanceBreadcrumbResolver,
    AdaptiveInstanceResolver,
    AdaptiveInstanceTitleResolver,
} from '@crczp/training-agenda/resolvers';
import { AdaptiveInstanceOverviewComponent } from './adaptive-instance-overview.component';
import { AdaptiveInstanceOverviewService } from '../services/state/adaptive-instance-overview.service';
import { AdaptiveInstanceOverviewConcreteService } from '../services/state/adaptive-instance-overview-concrete.service';
import { AdaptiveInstanceOverviewMaterialModule } from './adaptive-instance-overview-material.module';
import { InstanceCountdownComponent } from './instance-countdown/instance-countdown.component';
import { TableDateCellComponent } from '@crczp/training-agenda/internal';

/**
 * Main module of training instance agenda. Contains components and providers for displaying table of training instance
 * and CRUD operations on them. It contains routing to more feature modules (detail atc.)
 */
@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        SentinelTableModule,
        SentinelControlsComponent,
        AdaptiveInstanceOverviewMaterialModule,
        TableDateCellComponent,
    ],
    declarations: [AdaptiveInstanceOverviewComponent, InstanceCountdownComponent],
    providers: [
        TrainingAgendaContext,
        DefaultPaginationService,
        AdaptiveInstanceResolver,
        AdaptiveInstanceTitleResolver,
        AdaptiveInstanceBreadcrumbResolver,
        { provide: TrainingNavigator, useClass: TrainingDefaultNavigator },
        { provide: AdaptiveInstanceOverviewService, useClass: AdaptiveInstanceOverviewConcreteService },
    ],
})
export class AdaptiveInstanceOverviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<AdaptiveInstanceOverviewComponentsModule> {
        return {
            ngModule: AdaptiveInstanceOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
