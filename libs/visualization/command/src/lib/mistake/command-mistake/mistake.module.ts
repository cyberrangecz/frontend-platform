import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MistakeComponent } from './mistake.component';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatListModule } from '@angular/material/list';
import { MistakeCommandService } from './service/mistake-command.service';
import { MistakeCommandApiService } from './api/mistake-command-api.service';
import { SentinelTableModule } from '@sentinel/components/table';
import { CommandDetailComponent } from './detail/command-detail.component';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SentinelResourceSelectorModule } from '@sentinel/components/resource-selector';
import { MatCardModule } from '@angular/material/card';
import {
    CommandVisualizationConfig,
    VisualizationConfigService,
} from '@crczp/command-visualizations/internal';

@NgModule({
    declarations: [MistakeComponent, CommandDetailComponent],
    imports: [
        CommonModule,
        FormsModule,
        MatTableModule,
        MatListModule,
        SentinelTableModule,
        MatButtonModule,
        MatSlideToggleModule,
        SentinelResourceSelectorModule,
        MatCardModule,
    ],
    exports: [MistakeComponent, CommandDetailComponent],
    providers: [
        MistakeCommandService,
        MistakeCommandApiService,
        VisualizationConfigService,
    ],
})
export class MistakeModule {
    static forRoot(
        config: CommandVisualizationConfig
    ): ModuleWithProviders<MistakeModule> {
        return {
            ngModule: MistakeModule,
            providers: [
                { provide: CommandVisualizationConfig, useValue: config },
            ],
        };
    }
}
