import {RouterModule} from '@angular/router';
import {NgModule} from '@angular/core';
import {AssessmentWrapperComponent} from './assessment-wrapper/assessment-wrapper.component';
import {DashboardWrapperComponent} from './dashboard-wrapper/dashboard-wrapper.component';
import {TrainingInstanceResultsComponent} from './training-instance-results.component';
import {CommandTimelineWrapperComponent} from './command-timeline-wrapper/command-timeline-wrapper.component';
import {CommandAnalysisWrapperComponent} from './command-analysis-wrapper/command-analysis-wrapper.component';
import {WalkthroughWrapperComponent} from './walkthrough-wrapper/walkthrough-wrapper.component';
import {ValidRouterConfig} from "@crczp/common";

const routes: ValidRouterConfig<'linear-instance/:instanceId/results'> = [
    {
        path: '',
        component: TrainingInstanceResultsComponent,
        children: [
            {
                path: '',
                pathMatch: 'prefix',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                component: DashboardWrapperComponent,
            },
            {
                path: 'quiz-results',
                component: AssessmentWrapperComponent,
            },
            {
                path: 'walkthrough',
                component: WalkthroughWrapperComponent,
            },
            {
                path: 'command-timeline',
                component: CommandTimelineWrapperComponent,
            },
            {
                path: 'command-analysis',
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
