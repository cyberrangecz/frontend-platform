import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SandboxApiModule } from '@crczp/sandbox-api';
import { TrainingApiModule } from '@crczp/training-api';
import {
    Routing,
    TrainingResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';
import { canDeactivateTrainingDefinition } from '@crczp/training-agenda/definition-edit';
import { LinearTrainingDefinitionOverviewComponent } from '@crczp/training-agenda/definition-overview';

const routes: ValidRouterConfig<'linear-definition'> = [
    {
        path: '',
        component: LinearTrainingDefinitionOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [canDeactivateTrainingDefinition],
        data: { title: 'Create Training Definition', breadcrumb: 'Create' },
    },
    {
        path: ':definitionId/edit',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-edit').then(
                (m) => m.TrainingDefinitionEditOverviewComponent,
            ),
        canDeactivate: [canDeactivateTrainingDefinition],
        resolve: Routing.Resolvers.resolveTrainingDefinition({
            title: 'Edit {title}',
            breadcrumb: '{title}',
        }),
    },
    {
        path: ':definitionId/preview',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-preview').then(
                (m) => m.TrainingPreviewComponent,
            ),
        data: {
            title: undefined,
        },
        resolve: Routing.Resolvers.resolveTrainingDefinition({
            breadcrumb: 'Preview',
        }),
    },
    {
        path: ':definitionId/detail',
        loadComponent: () =>
            import('@crczp/training-agenda/definition-summary').then(
                (m) => m.TrainingDefinitionSummaryComponent,
            ),
        resolve: Routing.Resolvers.resolveTrainingDefinition({
            title: 'Detail of {title}',
            breadcrumb: 'Detail',
        }),
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
    providers: [TrainingResolverHelperService],
    exports: [RouterModule],
})
export class TrainingDefinitionRoutingModule {}
