import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { canDeactivateGroup } from '@crczp/user-and-group-agenda/group-edit';
import { GroupOverviewComponent } from '@crczp/user-and-group-agenda/group-overview';
import { UserAndGroupApiModule } from '@crczp/user-and-group-api';
import {
    Routing,
    UserAndGroupResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'group'> = [
    {
        path: '',
        component: GroupOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then(
                (m) => m.GroupEditOverviewComponent
            ),
        data: { title: 'Create Group', breadcrumb: 'Create' },
        canDeactivate: [canDeactivateGroup],
    },
    {
        path: ':groupId/edit',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-edit').then(
                (m) => m.GroupEditOverviewComponent
            ),
        resolve: Routing.Resolvers.resolveGroup({
            title: 'Edit {name}',
            breadcrumb: 'Edit',
        }),
        canDeactivate: [canDeactivateGroup],
    },
    {
        path: ':groupId',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/group-detail').then(
                (m) => m.GroupDetailComponent
            ),
        resolve: Routing.Resolvers.resolveGroup({
            title: 'Detail of {name}',
            breadcrumb: '{name}',
        }),
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes), UserAndGroupApiModule],
    providers: [UserAndGroupResolverHelperService],
    exports: [RouterModule],
})
export class GroupRoutingModule {}
