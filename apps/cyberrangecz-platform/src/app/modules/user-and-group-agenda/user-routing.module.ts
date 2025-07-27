import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import {
    UserBreadcrumbResolverService,
    UserOverviewComponent,
    UserResolverService,
    UserTitleResolverService,
} from '@crczp/user-and-group-agenda/user-overview';
import { User } from '@crczp/user-and-group-model';
import { UserAndGroupApiModule } from '@crczp/user-and-group-api';
import { ValidRouterConfig } from '@crczp/routing-commons';

const routes: ValidRouterConfig<'user'> = [
    {
        path: '',
        component: UserOverviewComponent,
    },
    {
        path: ':userId',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/user-detail').then(
                (m) => m.UserDetailComponent
            ),
        resolve: {
            [User.name]: UserResolverService,
            breadcrumb: UserBreadcrumbResolverService,
            title: UserTitleResolverService,
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
export class UserRoutingModule {}
