import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import {
    TRAINING_RUN_RESULTS_COMMAND_ANALYSIS_PATH,
    TRAINING_RUN_RESULTS_COMMAND_TIMELINE_PATH,
    TRAINING_RUN_RESULTS_SCORE_DEVELOPMENT_PATH,
} from '@crczp/training-agenda';

import { CommandTimelineWrapperComponent } from './command-timeline-wrapper/command-timeline-wrapper.component';
import { CommandAnalysisWrapperComponent } from './command-analysis-wrapper/command-analysis-wrapper.component';
import { TrainingRunResultsComponent } from './training-run-results.component';
import { ScoreDevelopmentWrapperComponent } from './score-development-wrapper/score-development-wrapper.component';

const routes: Routes = [
    {
        path: '',
        component: TrainingRunResultsComponent,
        children: [
            { path: '', pathMatch: 'prefix', redirectTo: TRAINING_RUN_RESULTS_SCORE_DEVELOPMENT_PATH },
            {
                path: TRAINING_RUN_RESULTS_SCORE_DEVELOPMENT_PATH,
                component: ScoreDevelopmentWrapperComponent,
            },
            {
                path: TRAINING_RUN_RESULTS_COMMAND_TIMELINE_PATH,
                component: CommandTimelineWrapperComponent,
            },
            {
                path: TRAINING_RUN_RESULTS_COMMAND_ANALYSIS_PATH,
                component: CommandAnalysisWrapperComponent,
            },
        ],
    },
];

/**
 * Routing for training run module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingRunResultsRoutingModule {
}
