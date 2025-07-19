import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PATHS,} from '@crczp/training-agenda';
import {
    AccessAdaptiveRunResolver,
    AccessTrainingRunResolver,
    AdaptiveRunResultsResolver,
    TrainingRunResultsResolver,
} from '@crczp/training-agenda/resolvers';
import {TrainingRunOverviewComponent} from '@crczp/training-agenda/run-overview';
import {AdaptiveRunPhasesDeactivateGuard} from "@crczp/training-agenda/adaptive-run-detail";
import {TrainingRunLevelsDeactivateGuard} from "@crczp/training-agenda/run-detail";

const runPaths: string[] = [
    `${PATHS.RUN.ADAPTIVE}/${PATHS.ACTION.ACCESS}/:${PATHS.RUN.ATTRIBUTE.TOKEN}`,
    `${PATHS.RUN.ADAPTIVE}/${PATHS.ACTION.RESUME}/:${PATHS.RUN.ATTRIBUTE.ID}`,
    `${PATHS.RUN.LINEAR}/${PATHS.ACTION.ACCESS}/:${PATHS.RUN.ATTRIBUTE.TOKEN}`,
    `${PATHS.RUN.LINEAR}/${PATHS.ACTION.RESUME}/:${PATHS.RUN.ATTRIBUTE.ID}`,
]

const routes: Routes = [
    {
        path: '',
        component: TrainingRunOverviewComponent,
    },
    ...runPaths.map((path) => ({
        path,
        loadComponent: () =>
            import('@crczp/training-agenda/run-overview').then((m) => m.TrainingRunOverviewComponent),
        data: {
            breadcrumb: 'Training',
            title: 'Training',
        },
        resolve: {
            [PATHS.RUN.ATTRIBUTE.DATA]: path.includes(PATHS.RUN.ADAPTIVE)
                ? AccessAdaptiveRunResolver
                : AccessTrainingRunResolver,
        },
        canDeactivate: path.includes(PATHS.RUN.ADAPTIVE) ? [AdaptiveRunPhasesDeactivateGuard] : [TrainingRunLevelsDeactivateGuard],
    })),
    {
        path: `${PATHS.RUN.LINEAR}/${PATHS.RUN.RESULTS}/:${PATHS.RUN.ATTRIBUTE.ID}`,
        loadComponent: () =>
            import('@crczp/training-agenda/run-results').then((m) => m.TrainingRunResultsComponent),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: {[PATHS.RUN.ATTRIBUTE.DATA]: TrainingRunResultsResolver},
    },
    {
        path: `${PATHS.RUN.ADAPTIVE}/${PATHS.RUN.RESULTS}/:${PATHS.RUN.ATTRIBUTE.ID}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-run-results').then((m) => m.AdaptiveRunResultsComponent),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: {[PATHS.RUN.ATTRIBUTE.DATA]: AdaptiveRunResultsResolver},
    },
    {
        path: PATHS.MITRE.TABLE,
        loadComponent: () => import('@crczp/training-agenda/mitre-techniques').then((m) => m.MitreTechniquesComponent),
        data: {
            title: 'MITRE Techniques',
            breadcrumb: 'MITRE Techniques',
            showSwitch: true,
        },
    },
];

@NgModule({
    imports: [
        RouterModule.forChild(routes),
        TrainingRunOverviewComponent,
    ],
    exports: [RouterModule],
})
export class TrainingRunRoutingModule {
}
