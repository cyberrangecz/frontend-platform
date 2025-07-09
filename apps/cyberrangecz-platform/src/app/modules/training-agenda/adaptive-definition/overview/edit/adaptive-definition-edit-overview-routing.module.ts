import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    AdaptiveDefinitionBreadcrumbResolver,
    AdaptiveDefinitionResolver,
    AdaptiveDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {
    AdaptiveDefinitionCanDeactivate,
    AdaptiveDefinitionEditOverviewComponent,
} from '@crczp/training-agenda/adaptive-definition-edit';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveDefinitionEditOverviewComponent,
        resolve: {
            [ADAPTIVE_DEFINITION_DATA_ATTRIBUTE_NAME]: AdaptiveDefinitionResolver,
            breadcrumb: AdaptiveDefinitionBreadcrumbResolver,
            title: AdaptiveDefinitionTitleResolver,
        },
        canDeactivate: [AdaptiveDefinitionCanDeactivate],
    },
];

/**
 * Routing for adaptive definition edit overview
 */

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveDefinitionEditOverviewRoutingModule {}
