import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserOverviewComponent } from '@crczp/user-and-group-agenda/user-overview';
import { UserAndGroupApiModule } from '@crczp/user-and-group-api';
import {
    Routing,
    UserAndGroupResolverHelperService,
    ValidRouterConfig,
} from '@crczp/routing-commons';

const routes: ValidRouterConfig<'user'> = [
    {
        path: '',
        component: UserOverviewComponent,
    },
    {
        path: ':userId',
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/user-detail').then(
                (m) => m.UserDetailComponent,
            ),
        resolve: Routing.Resolvers.resolveUser({
            title: '{name} Detail',
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
export class UserRoutingModule {}
