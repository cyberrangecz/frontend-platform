import {RouterModule, Routes} from '@angular/router';
import {ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME, SUMMARY_PATH} from '@crczp/training-agenda';
import {NgModule} from '@angular/core';
import {
    AdaptiveDefinitionDetailBreadcrumbResolver,
    AdaptiveDefinitionDetailTitleResolver,
    AdaptiveDefinitionResolver,
} from '@crczp/training-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        pathMatch: 'full',
        redirectTo: SUMMARY_PATH,
    },
    {
        path: SUMMARY_PATH,
        resolve: {
            [ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionDetailBreadcrumbResolver,
            title: AdaptiveDefinitionDetailTitleResolver,
        },
        loadChildren: () =>
            import('./summary/adaptive-definition-summary.module').then((m) => m.AdaptiveDefinitionSummaryModule),
    },
];

/**
 * Routing module for adaptive defintion detail module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveDefinitionDetailRoutingModule {}
