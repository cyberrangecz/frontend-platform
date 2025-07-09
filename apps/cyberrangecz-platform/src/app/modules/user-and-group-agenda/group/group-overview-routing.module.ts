import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    GROUP_DATA_ATTRIBUTE_NAME,
    GROUP_DETAIL_PATH,
    GROUP_EDIT_PATH,
    GROUP_NEW_PATH,
    GROUP_SELECTOR,
} from '@crczp/user-and-group-agenda';

import {
    GroupBreadcrumbResolver,
    GroupOverviewComponent,
    GroupResolver,
    GroupTitleResolver,
} from '@crczp/user-and-group-agenda/group-overview';

const routes: Routes = [
    {
        path: '',
        component: GroupOverviewComponent,
    },
    {
        path: GROUP_NEW_PATH,
        loadChildren: () => import('./edit/group-edit.module').then((m) => m.GroupEditModule),
        resolve: {
            [GROUP_DATA_ATTRIBUTE_NAME]: GroupResolver,
            breadcrumb: GroupBreadcrumbResolver,
            title: GroupTitleResolver,
        },
    },
    {
        path: `:${GROUP_SELECTOR}/${GROUP_EDIT_PATH}`,
        loadChildren: () => import('./edit/group-edit.module').then((m) => m.GroupEditModule),
        resolve: {
            [GROUP_DATA_ATTRIBUTE_NAME]: GroupResolver,
            breadcrumb: GroupBreadcrumbResolver,
            title: GroupTitleResolver,
        },
    },
    {
        path: `:${GROUP_SELECTOR}/${GROUP_DETAIL_PATH}`,
        loadChildren: () => import('./detail/group-detail.module').then((m) => m.GroupDetailModule),
        resolve: {
            [GROUP_DATA_ATTRIBUTE_NAME]: GroupResolver,
            breadcrumb: GroupBreadcrumbResolver,
            title: GroupTitleResolver,
        },
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class GroupOverviewRoutingModule {}
