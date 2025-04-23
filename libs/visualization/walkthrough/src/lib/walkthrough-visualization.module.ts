import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { WalkthroughVisualizationComponent } from './walkthrough-visualization.component';
import {
    WalkthroughVisualizationWrapperComponent
} from './components/walkthrough-visualization-wrapper/walkthrough-visualization-wrapper.component';
import { WalkthroughVisualizationConfig } from './config/walkthrough-visualization-config';
import { ChartBaseComponent } from './components/chart-base/chart-base.component';
import { PlayersTrainingsComponent } from './components/chart-base/players-trainings/players-trainings.component';
import {
    PlayerTrainingComponent
} from './components/chart-base/players-trainings/player-training/player-training.component';
import {
    CommandsTooltipComponent
} from './components/chart-base/players-trainings/player-training/commands-tooltip/commands-tooltip.component';
import {
    PlayerEventComponent
} from './components/chart-base/players-trainings/player-training/player-event/player-event.component';
import {
    EventConnectorComponent
} from './components/chart-base/players-trainings/player-training/event-connector/event-connector.component';
import { YAxisComponent } from './components/chart-base/chart-axes/y-axis/y-axis.component';
import { SuccessAxisComponent } from './components/chart-base/chart-axes/success-axis/success-axis.component';
import { ChartAxesComponent } from './components/chart-base/chart-axes/chart-axes.component';
import { CommonModule } from '@angular/common';
import { WalkthroughVisualizationService } from './services/walkthrough-visualization.service';
import { AbsolutePositionService } from './services/absolute-position.service';
import { WalkthroughVisualizationApi } from './api/walkthrough-visualization-api.service';
import { HttpClient } from '@angular/common/http';
import { ConfigService } from './config/config.service';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';

const MAT_MODULES = [
    MatButtonModule, MatTooltipModule, MatSelectModule,
    MatFormFieldModule, FormsModule
];

const LOCAL_COMPONENTS = [
    WalkthroughVisualizationWrapperComponent,
    ChartBaseComponent,
    PlayersTrainingsComponent,
    PlayerTrainingComponent,
    CommandsTooltipComponent,
    PlayerEventComponent,
    EventConnectorComponent,
    YAxisComponent,
    SuccessAxisComponent,
    ChartAxesComponent
];

@NgModule({
    declarations: [
        WalkthroughVisualizationComponent
    ],
    imports: [
        CommonModule, ...MAT_MODULES , ...LOCAL_COMPONENTS
    ],
    exports: [WalkthroughVisualizationComponent],
    providers: [
        WalkthroughVisualizationService,
        AbsolutePositionService,
        ConfigService,
        WalkthroughVisualizationApi,
        HttpClient
    ]
})
export class WalkthroughVisualizationModule {
    constructor(@Optional() @SkipSelf() parentModule: WalkthroughVisualizationModule) {
        if (parentModule) {
            throw new Error('WalkthroughVisualizationModule is already loaded. Import it in the main module only');
        }
    }

    static forRoot(config: WalkthroughVisualizationConfig): ModuleWithProviders<WalkthroughVisualizationModule> {
        return {
            ngModule: WalkthroughVisualizationModule,
            providers: [{ provide: WalkthroughVisualizationConfig, useValue: config }]
        };
    }
}
