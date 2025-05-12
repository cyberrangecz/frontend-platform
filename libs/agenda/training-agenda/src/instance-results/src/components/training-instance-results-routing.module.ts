import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import {
    TRAINING_RUN_RESULTS_ASSESSMENT_PATH,
    TRAINING_RUN_RESULTS_COMMAND_ANALYSIS_PATH,
    TRAINING_RUN_RESULTS_COMMAND_TIMELINE_PATH,
    TRAINING_RUN_RESULTS_DASHBOARD_PATH,
    TRAINING_RUN_RESULTS_WALKTHROUGH_PATH,
} from '../../../index';
import { AssessmentWrapperComponent } from './assessment-wrapper/assessment-wrapper.component';
import { DashboardWrapperComponent } from './dashboard-wrapper/dashboard-wrapper.component';
import { TrainingInstanceResultsComponent } from './training-instance-results.component';
import { CommandTimelineWrapperComponent } from './command-timeline-wrapper/command-timeline-wrapper.component';
import { CommandAnalysisWrapperComponent } from './command-analysis-wrapper/command-analysis-wrapper.component';
import { WalkthroughWrapperComponent } from './walkthrough-wrapper/walkthrough-wrapper.component';

const routes: Routes = [
    {
        path: '',
        component: TrainingInstanceResultsComponent,
        children: [
            {
                path: '',
                pathMatch: 'prefix',
                redirectTo: TRAINING_RUN_RESULTS_DASHBOARD_PATH,
            },
            {
                path: TRAINING_RUN_RESULTS_DASHBOARD_PATH,
                component: DashboardWrapperComponent,
            },
            {
                path: TRAINING_RUN_RESULTS_ASSESSMENT_PATH,
                component: AssessmentWrapperComponent,
            },
            {
                path: TRAINING_RUN_RESULTS_WALKTHROUGH_PATH,
                component: WalkthroughWrapperComponent,
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
 * Routing for training instance module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceResultsRoutingModule {
}
