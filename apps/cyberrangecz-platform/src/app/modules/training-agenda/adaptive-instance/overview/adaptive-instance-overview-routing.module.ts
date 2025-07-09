import {RouterModule, Routes} from '@angular/router';
import {
    ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME,
    ADAPTIVE_INSTANCE_SELECTOR,
    TRAINING_INSTANCE_DETAIL_PATH,
    TRAINING_INSTANCE_EDIT_PATH,
    TRAINING_INSTANCE_NEW_PATH,
} from '@crczp/training-agenda';
import {NgModule} from '@angular/core';
import {
    AdaptiveInstanceBreadcrumbResolver,
    AdaptiveInstanceResolver,
    AdaptiveInstanceTitleResolver,
} from '@crczp/training-agenda/resolvers';
import {AdaptiveInstanceOverviewComponent} from '@crczp/training-agenda/adaptive-instance-overview';

const routes: Routes = [
    {
        path: '',
        component: AdaptiveInstanceOverviewComponent,
    },
    {
        path: `:${ADAPTIVE_INSTANCE_SELECTOR}/${TRAINING_INSTANCE_DETAIL_PATH}`,
        loadChildren: () =>
            import('./detail/adaptive-instance-detail.module').then((m) => m.AdaptiveInstanceDetailModule),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
    },
    {
        path: TRAINING_INSTANCE_NEW_PATH,
        loadChildren: () =>
            import('./edit/adaptive-instance-edit-overview.module').then((m) => m.AdaptiveInstanceEditOverviewModule),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
    },
    {
        path: `:${ADAPTIVE_INSTANCE_SELECTOR}/${TRAINING_INSTANCE_EDIT_PATH}`,
        loadChildren: () =>
            import('./edit/adaptive-instance-edit-overview.module').then((m) => m.AdaptiveInstanceEditOverviewModule),
        resolve: {
            [ADAPTIVE_INSTANCE_DATA_ATTRIBUTE_NAME]: AdaptiveInstanceResolver,
            breadcrumb: AdaptiveInstanceBreadcrumbResolver,
            title: AdaptiveInstanceTitleResolver,
        },
    },
];

/**
 * Routing for training instance module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveInstanceOverviewRoutingModule {}
