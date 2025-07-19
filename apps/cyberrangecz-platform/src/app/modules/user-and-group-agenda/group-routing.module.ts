import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';


import {
    GroupBreadcrumbResolver,
    GroupOverviewComponent,
    GroupResolver,
    GroupTitleResolver,
} from '@crczp/user-and-group-agenda/group-overview';
import {GroupEditCanDeactivate} from "@crczp/user-and-group-agenda/group-edit";
import {GROUP_DATA_ATTRIBUTE_NAME} from "@crczp/user-and-group-agenda";
import {PATHS} from "../../paths";

const routes: Routes = [
    {
        path: '',
        component: GroupOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then((m) => m.GroupEditComponent),
        resolve: {
            [GROUP_DATA_ATTRIBUTE_NAME]: GroupResolver,
            breadcrumb: GroupBreadcrumbResolver,
            title: GroupTitleResolver,
        },
        canDeactivate: [GroupEditCanDeactivate],
    },
    {
        path: `:${GROUP_SELECTOR}/${GROUP_EDIT_PATH}`,
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then((m) => m.GroupEditComponent),
        resolve: {
            [GROUP_DATA_ATTRIBUTE_NAME]: GroupResolver,
            breadcrumb: GroupBreadcrumbResolver,
            title: GroupTitleResolver,
        },
        canDeactivate: [GroupEditCanDeactivate],
    },
    {
        path: `:${GROUP_SELECTOR}/${GROUP_DETAIL_PATH}`,
        loadComponent: () => import('./detail/group-detail.module').then((m) => m.GroupDetailModule),
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
export class GroupRoutingModule {
}
