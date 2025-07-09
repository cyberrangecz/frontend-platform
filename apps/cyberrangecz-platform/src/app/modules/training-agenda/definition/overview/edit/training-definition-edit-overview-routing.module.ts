import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/training-agenda';
import {
    TrainingDefinitionCanDeactivate,
    TrainingDefinitionEditOverviewComponent,
} from '@crczp/training-agenda/definition-edit';
import {
    TrainingDefinitionBreadcrumbResolver,
    TrainingDefinitionResolver,
    TrainingDefinitionTitleResolver,
} from '@crczp/training-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: TrainingDefinitionEditOverviewComponent,
        resolve: {
            [TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME]: TrainingDefinitionResolver,
            breadcrumb: TrainingDefinitionBreadcrumbResolver,
            title: TrainingDefinitionTitleResolver,
        },
        canDeactivate: [TrainingDefinitionCanDeactivate],
    },
];

/**
 * Routing for training definition edit overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class TrainingDefinitionEditOverviewRoutingModule {}
