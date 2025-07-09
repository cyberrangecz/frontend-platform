import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    ADAPTIVE_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME,
    ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME,
    ADAPTIVE_RUN_PATH,
    ADAPTIVE_RUN_RESULTS_PATH,
    ADAPTIVE_RUN_SELECTOR,
    MITRE_TECHNIQUES_PATH,
    TRAINING_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME,
    TRAINING_RUN_ACCESS_PATH,
    TRAINING_RUN_ACCESS_SELECTOR,
    TRAINING_RUN_DATA_ATTRIBUTE_NAME,
    TRAINING_RUN_RESULTS_PATH,
    TRAINING_RUN_RESUME_PATH,
    TRAINING_RUN_SELECTOR,
} from '@crczp/training-agenda';
import {
    AccessAdaptiveRunResolver,
    AccessTrainingRunResolver,
    AdaptiveRunResultsResolver,
    TrainingRunResultsResolver,
} from '@crczp/training-agenda/resolvers';
import {TrainingRunOverviewComponent} from '@crczp/training-agenda/run-overview';

const routes: Routes = [
    {
        path: '',
        component: TrainingRunOverviewComponent,
    },
    {
        path: `${ADAPTIVE_RUN_PATH}/${TRAINING_RUN_ACCESS_PATH}/:${TRAINING_RUN_ACCESS_SELECTOR}`,
        loadChildren: () =>
            import('./detail/adaptive/adaptive-run-detail.module').then((m) => m.AdaptiveRunDetailModule),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: { [ADAPTIVE_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME]: AccessAdaptiveRunResolver },
    },
    {
        path: `${ADAPTIVE_RUN_PATH}/${TRAINING_RUN_RESUME_PATH}/:${TRAINING_RUN_SELECTOR}`,
        loadChildren: () =>
            import('./detail/adaptive/adaptive-run-detail.module').then((m) => m.AdaptiveRunDetailModule),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: { [ADAPTIVE_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME]: AccessAdaptiveRunResolver },
    },
    {
        path: `${TRAINING_RUN_ACCESS_PATH}/:${TRAINING_RUN_ACCESS_SELECTOR}`,
        loadChildren: () =>
            import('./detail/training/training-run-detail.module').then((m) => m.TrainingRunDetailModule),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: { [TRAINING_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME]: AccessTrainingRunResolver },
    },
    {
        path: `${TRAINING_RUN_RESUME_PATH}/:${TRAINING_RUN_SELECTOR}`,
        loadChildren: () =>
            import('./detail/training/training-run-detail.module').then((m) => m.TrainingRunDetailModule),
        data: {
            breadcrumb: 'Training',
            title: undefined,
        },
        resolve: { [TRAINING_RUN_ACCESS_INFO_DATA_ATTRIBUTE_NAME]: AccessTrainingRunResolver },
    },
    {
        path: `${TRAINING_RUN_RESULTS_PATH}/:${TRAINING_RUN_SELECTOR}`,
        loadChildren: () =>
            import('./results/linear/training-run-results.module').then((m) => m.TrainingRunResultsModule),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: { [TRAINING_RUN_DATA_ATTRIBUTE_NAME]: TrainingRunResultsResolver },
    },
    {
        path: `${ADAPTIVE_RUN_RESULTS_PATH}/:${ADAPTIVE_RUN_SELECTOR}`,
        loadChildren: () =>
            import('./results/adaptive/adaptive-run-results.module').then((m) => m.AdaptiveRunResultsModule),
        data: {
            breadcrumb: 'Results',
            title: 'Training Run Results',
        },
        resolve: { [ADAPTIVE_RUN_DATA_ATTRIBUTE_NAME]: AdaptiveRunResultsResolver },
    },
    {
        path: `:${MITRE_TECHNIQUES_PATH}`,
        loadChildren: () => import('./mitre-techniques/mitre-techniques.module').then((m) => m.MitreTechniquesModule),
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingRunOverviewRoutingModule {}
