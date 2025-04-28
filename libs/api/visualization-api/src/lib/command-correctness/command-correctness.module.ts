import { ModuleWithProviders, NgModule } from '@angular/core';
import { CommandVisualizationConfig } from './command-visualization-config';
import { CommandCorrectnessApi, CommandCorrectnessDefaultApi } from './command-correctness-api.service';


@NgModule({
    providers: [
        {
            provide: CommandCorrectnessApi, useClass: CommandCorrectnessDefaultApi
        }
    ]
})
export class CommandCorrectnessApiModule {
    static forRoot(config: CommandVisualizationConfig): ModuleWithProviders<CommandCorrectnessApiModule> {
        return {
            ngModule: CommandCorrectnessApiModule,
            providers: [{ provide: CommandVisualizationConfig, useValue: config }]
        };
    }
}
