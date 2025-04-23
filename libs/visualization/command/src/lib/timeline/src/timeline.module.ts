import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TimelineComponent } from './timeline.component';
import { MglTimelineModule } from 'angular-mgl-timeline';
import { ReactiveFormsModule } from '@angular/forms';
import { TimelineCommandService } from './service/timeline-command.service';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommandVisualizationConfig, VisualizationConfigService } from '@crczp/command-visualizations/internal';
import { TimelineCommandApiConcreteService } from './api/timeline-command-api.concrete.service';
import { CommandApiConcreteService } from './api/command-api.concrete.service';

@NgModule({
    declarations: [TimelineComponent],
    imports: [
        CommonModule,
        MglTimelineModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatSelectModule,
        MatCheckboxModule,
    ],
    exports: [TimelineComponent],
    providers: [
        TimelineCommandService,
        VisualizationConfigService,
        TimelineCommandApiConcreteService,
        CommandApiConcreteService,
    ],
})
export class TimelineModule {
    static forRoot(config: CommandVisualizationConfig): ModuleWithProviders<TimelineModule> {
        return {
            ngModule: TimelineModule,
            providers: [{ provide: CommandVisualizationConfig, useValue: config }],
        };
    }
}
