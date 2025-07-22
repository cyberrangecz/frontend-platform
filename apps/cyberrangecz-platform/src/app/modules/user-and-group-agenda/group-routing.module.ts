import {NgModule} from '@angular/core';
import {RouterModule} from '@angular/router';
import {GroupEditCanDeactivate} from "@crczp/user-and-group-agenda/group-edit";
import {Routing, ValidRouterConfig} from "@crczp/common";
import {Group} from "@crczp/user-and-group-model";
import {GroupOverviewComponent} from "@crczp/user-and-group-agenda/group-overview";

const routes: ValidRouterConfig<'group'> = [
    {
        path: '',
        component: GroupOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then((m) => m.GroupEditComponent),
        resolve: {
            [Group.name]: Routing.Resolvers.Group.resolveGroup,
            breadcrumb: Routing.Resolvers.Group.resolveGroupBreadcrumb,
            title: Routing.Resolvers.Group.resolveGroupTitle,
        },
        canDeactivate: [GroupEditCanDeactivate],
    },
    {
        path: ':groupId/edit',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then((m) => m.GroupEditComponent),
        resolve: {
            [Group.name]: Routing.Resolvers.Group.resolveGroup,
            breadcrumb: Routing.Resolvers.Group.resolveGroupBreadcrumb,
            title: Routing.Resolvers.Group.resolveGroupTitle,
        },
        canDeactivate: [GroupEditCanDeactivate],
    },
    {
        path: ':groupId',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then((m) => m.GroupUserAssignComponent),
        resolve: {
            [Group.name]: Routing.Resolvers.Group.resolveGroup,
            breadcrumb: Routing.Resolvers.Group.resolveGroupBreadcrumb,
            title: Routing.Resolvers.Group.resolveGroupTitle,
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
