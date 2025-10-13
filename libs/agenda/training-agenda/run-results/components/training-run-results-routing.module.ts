import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';

import {CommandTimelineWrapperComponent} from './command-timeline-wrapper/command-timeline-wrapper.component';
import {CommandAnalysisWrapperComponent} from './command-analysis-wrapper/command-analysis-wrapper.component';
import {TrainingRunResultsComponent} from './training-run-results.component';
import {ScoreDevelopmentWrapperComponent} from './score-development-wrapper/score-development-wrapper.component';

const routes: Routes = [
    {
        path: '',
        component: TrainingRunResultsComponent,
        children: [
            {path: '', pathMatch: 'prefix', redirectTo: 'score-developmen'},
            {
                path: 'score-developmen',
                component: ScoreDevelopmentWrapperComponent,
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
 * Routing for training run module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingRunResultsRoutingModule {
}
