import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { ValidRouterConfig } from '@crczp/routing-commons';

const routes: ValidRouterConfig<'linear-instance/:instanceId/results'> = [
    {
        path: '',
        loadComponent: () =>
            import('./training-instance-results.component').then(
                (m) => m.TrainingInstanceResultsComponent,
            ),
        children: [
            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard',
            },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import(
                        './dashboard-wrapper/dashboard-wrapper.component'
                    ).then((m) => m.DashboardWrapperComponent),
            },
            {
                path: 'quiz-results',
                loadComponent: () =>
                    import(
                        './assessment-wrapper/assessment-wrapper.component'
                    ).then((m) => m.AssessmentWrapperComponent),
            },
            {
                path: 'walkthrough',
                loadComponent: () =>
                    import(
                        './walkthrough-wrapper/walkthrough-wrapper.component'
                    ).then((m) => m.WalkthroughWrapperComponent),
            },
            {
                path: 'command-timeline',
                loadComponent: () =>
                    import(
                        './command-timeline-wrapper/command-timeline-wrapper.component'
                    ).then((m) => m.CommandTimelineWrapperComponent),
            },
            {
                path: 'command-analysis',
                loadComponent: () =>
                    import(
                        './command-analysis-wrapper/command-analysis-wrapper.component'
                    ).then((m) => m.CommandAnalysisWrapperComponent),
            },
        ],
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingInstanceResultsRoutingModule {}
