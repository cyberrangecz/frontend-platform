import {CommonModule} from '@angular/common';
import {ModuleWithProviders, NgModule} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {SentinelControlsComponent} from '@sentinel/components/controls';
import {SentinelTableModule} from '@sentinel/components/table';
import {TrainingAgendaConfig, TrainingDefaultNavigator, TrainingNavigator} from '@crczp/training-agenda';
import {DefaultPaginationService, TableDateCellComponent, TrainingAgendaContext} from '@crczp/training-agenda/internal';
import {
    TrainingInstanceBreadcrumbResolver,
    TrainingInstanceResolver,
    TrainingInstanceTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {TrainingInstanceOverviewConcreteService} from '../services/state/training-instance-overview-concrete.service';
import {TrainingInstanceOverviewService} from '../services/state/training-instance-overview.service';
import {TrainingInstanceOverviewComponent} from './training-instance-overview.component';
import {TrainingInstanceOverviewMaterialModule} from './training-instance-overview-material.module';
import {InstanceCountdownComponent} from './instance-countdown/instance-countdown.component';

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
        TrainingInstanceOverviewMaterialModule,
        TableDateCellComponent,
    ],
    declarations: [TrainingInstanceOverviewComponent, InstanceCountdownComponent],
    providers: [
        DefaultPaginationService,
        TrainingAgendaContext,
        TrainingInstanceResolver,
        TrainingInstanceTitleResolver,
        TrainingInstanceBreadcrumbResolver,
        { provide: TrainingNavigator, useClass: TrainingDefaultNavigator },
        { provide: TrainingInstanceOverviewService, useClass: TrainingInstanceOverviewConcreteService },
    ],
})
export class TrainingInstanceOverviewComponentsModule {
    static forRoot(config: TrainingAgendaConfig): ModuleWithProviders<TrainingInstanceOverviewComponentsModule> {
        return {
            ngModule: TrainingInstanceOverviewComponentsModule,
            providers: [{ provide: TrainingAgendaConfig, useValue: config }],
        };
    }
}
