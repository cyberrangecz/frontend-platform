import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {PATHS, TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME,} from '@crczp/training-agenda';
import {TrainingDefinitionOverviewComponent} from '@crczp/training-agenda/definition-overview';
import {
    TrainingDefinitionBreadcrumbResolver,
    TrainingDefinitionDetailBreadcrumbResolver,
    TrainingDefinitionDetailTitleResolver,
    TrainingDefinitionResolver,
} from '@crczp/training-agenda/resolvers';
import {SandboxApiModule} from "@crczp/sandbox-api";
import {TrainingApiModule} from "@crczp/training-api";
import {TrainingDefinitionCanDeactivate} from "@crczp/training-agenda/definition-edit";

const routes: Routes = [
    {
        path: '',
        component: TrainingDefinitionOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [TrainingDefinitionCanDeactivate],
    },
    {
        path: `:${PATHS.DEFINITION.ATTRIBUTE.ID}/${PATHS.ACTION.EDIT}`,
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [TrainingDefinitionCanDeactivate],
    },
    {
        path: `:${PATHS.DEFINITION.ATTRIBUTE.ID}/${PATHS.VIEW.PREVIEW}`,
        loadComponent: () => import('@crczp/training-agenda/definition-preview').then(
            (m) => m.TrainingPreviewComponent
        ),
        data: {
            title: undefined,
        },
        resolve: {
            [TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME]: TrainingDefinitionResolver,
            breadcrumb: TrainingDefinitionBreadcrumbResolver,
        },
    },
    {
        path: `:${PATHS.DEFINITION.ATTRIBUTE.ID}/${PATHS.VIEW.SUMMARY}`,
        loadComponent: () =>
            import('@crczp/training-agenda/definition-summary').then(
                (m) => m.TrainingDefinitionSummaryComponent
            ),
        resolve: {
            [TRAINING_DEFINITION_DATA_ATTRIBUTE_NAME]: TrainingDefinitionResolver,
            breadcrumb: TrainingDefinitionDetailBreadcrumbResolver,
            title: TrainingDefinitionDetailTitleResolver,
        },
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [
        RouterModule.forChild(routes),
        SandboxApiModule,
        TrainingApiModule,
    ],
    exports: [RouterModule],
})
export class TrainingDefinitionRoutingModule {
}
