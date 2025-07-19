import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdaptiveDefinitionOverviewComponent} from '@crczp/training-agenda/adaptive-definition-overview';
import {ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME, PATHS} from '@crczp/training-agenda';
import {
    AdaptiveDefinitionBreadcrumbResolver,
    AdaptiveDefinitionDetailBreadcrumbResolver,
    AdaptiveDefinitionDetailTitleResolver,
    AdaptiveDefinitionResolver,
    AdaptiveDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {TrainingApiModule} from '@crczp/training-api';
import {AdaptiveDefinitionCanDeactivate} from '@crczp/training-agenda/adaptive-definition-edit';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveDefinitionOverviewComponent,
    },
    {
        path: `${PATHS.DEFINITION.ADAPTIVE}/${PATHS.ACTION.CREATE}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-edit').then(
                (m) => m.AdaptiveDefinitionEditOverviewComponent
            ),
        resolve: {
            [PATHS.DEFINITION.ATTRIBUTE.ID]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
            title: AdaptiveDefinitionTitleResolver,
        },
        canDeactivate: [AdaptiveDefinitionCanDeactivate],
    },
    {
        path: `:${PATHS.DEFINITION.ADAPTIVE}/${PATHS.ACTION.EDIT}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-edit').then(
                (m) => m.AdaptiveDefinitionEditOverviewComponent
            ),
        resolve: {
            [PATHS.DEFINITION.ATTRIBUTE.ID]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
            title: AdaptiveDefinitionTitleResolver,
        },
        canDeactivate: [AdaptiveDefinitionCanDeactivate],
    },
    {
        path: `:${PATHS.DEFINITION.ADAPTIVE}/${PATHS.VIEW.PREVIEW}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-preview').then(
                (m) => m.AdaptivePreviewComponent
            ),
        data: {
            title: undefined,
        },
        resolve: {
            [ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
        },
    },
    {
        path: `:${PATHS.DEFINITION.ADAPTIVE}/${PATHS.VIEW.SUMMARY}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-summary').then(
                (m) => m.AdaptiveDefinitionSummaryComponent
            ),
        resolve: {
            [ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionDetailBreadcrumbResolver,
            title: AdaptiveDefinitionDetailTitleResolver,
        },
    },
    {
        path: `:${PATHS.DEFINITION.ADAPTIVE}/${PATHS.INSTANCE.SIMULATOR}`,
        loadComponent: () =>
            import('@crczp/training-agenda/adaptive-definition-simulator').then(
                (m) => m.AdaptiveDefinitionSimulatorComponent
            ),
        data: {
            title: 'Adaptive Model Simulating Tool',
        },
        resolve: {
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
        },
    },
];

/**
 * Routing module adaptive definition overview
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SandboxApiModule,
        TrainingApiModule,
    ],
    exports: [RouterModule],
})
export class AdaptiveDefinitionRoutingModule {
}
