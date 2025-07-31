import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { canDeactivateGroup } from '@crczp/user-and-group-agenda/group-edit';
import { Group } from '@crczp/user-and-group-model';
import { GroupOverviewComponent } from '@crczp/user-and-group-agenda/group-overview';
import { UserAndGroupApiModule } from '@crczp/user-and-group-api';
import { Routing, ValidRouterConfig } from '@crczp/routing-commons';

const routes: ValidRouterConfig<'group'> = [
    {
        path: '',
        component: GroupOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then(
                (m) => m.GroupEditComponent
            ),
        resolve: {
            [Group.name]: Routing.Resolvers.Group.resolveGroup,
            breadcrumb: Routing.Resolvers.Group.resolveGroupBreadcrumb,
            title: Routing.Resolvers.Group.resolveGroupTitle,
        },
        canDeactivate: [canDeactivateGroup],
    },
    {
        path: ':groupId/edit',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then(
                (m) => m.GroupEditComponent
            ),
        resolve: {
            [Group.name]: Routing.Resolvers.Group.resolveGroup,
            breadcrumb: Routing.Resolvers.Group.resolveGroupBreadcrumb,
            title: Routing.Resolvers.Group.resolveGroupTitle,
        },
        canDeactivate: [canDeactivateGroup],
    },
    {
        path: ':groupId',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then(
                (m) => m.GroupUserAssignComponent
            ),
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
    imports: [RouterModule.forChild(routes), UserAndGroupApiModule],
    exports: [RouterModule],
})
export class GroupRoutingModule {}
