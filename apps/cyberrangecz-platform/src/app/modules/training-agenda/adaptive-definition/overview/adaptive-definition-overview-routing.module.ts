import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {AdaptiveDefinitionOverviewComponent} from '@crczp/training-agenda/adaptive-definition-overview';
import {
    ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME,
    ADAPTIVE_DEFINITION_DETAIL_PATH,
    ADAPTIVE_DEFINITION_SELECTOR,
    SIMULATOR_PATH,
    TRAINING_DEFINITION_EDIT_PATH,
    TRAINING_DEFINITION_NEW_PATH,
    TRAINING_DEFINITION_PREVIEW_PATH,
} from '@crczp/training-agenda';
import {
    AdaptiveDefinitionBreadcrumbResolver,
    AdaptiveDefinitionResolver,
    AdaptiveDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveDefinitionOverviewComponent,
    },
    {
        path: TRAINING_DEFINITION_NEW_PATH,
        loadChildren: () =>
            import('./edit/adaptive-definition-edit-overview.module').then(
                (m) => m.AdaptiveDefinitionEditOverviewModule,
            ),
    },
    {
        path: `:${ADAPTIVE_DEFINITION_SELECTOR}/${TRAINING_DEFINITION_EDIT_PATH}`,
        loadChildren: () =>
            import('./edit/adaptive-definition-edit-overview.module').then(
                (m) => m.AdaptiveDefinitionEditOverviewModule,
            ),
    },
    {
        path: `:${ADAPTIVE_DEFINITION_SELECTOR}/${TRAINING_DEFINITION_PREVIEW_PATH}`,
        loadChildren: () => import('./preview/adaptive-preview.module').then((m) => m.AdaptivePreviewModule),
    },
    {
        path: `:${ADAPTIVE_DEFINITION_SELECTOR}/${ADAPTIVE_DEFINITION_DETAIL_PATH}`,
        loadChildren: () =>
            import('./detail/adaptive-definition-detail.module').then((m) => m.AdaptiveDefinitionDetailModule),
        resolve: {
            [ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
            title: AdaptiveDefinitionTitleResolver,
        },
    },
    {
        path: SIMULATOR_PATH,
        loadChildren: () =>
            import('./simulator/adaptive-definition-simulator.module').then((m) => m.AdaptiveDefinitionSimulatorModule),
    },
];

/**
 * Routing module adaptive definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveDefinitionOverviewRoutingModule {}
