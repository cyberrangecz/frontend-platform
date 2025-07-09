import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {
    UserBreadcrumbResolverService,
    UserOverviewComponent,
    UserResolverService,
    UserTitleResolverService,
} from '@crczp/user-and-group-agenda/user-overview';
import {USER_DATA_ATTRIBUTE_NAME, USER_DETAIL_PATH, USER_SELECTOR} from '@crczp/user-and-group-agenda';

const routes: Routes = [
    {
        path: '',
        component: UserOverviewComponent,
    },
    {
        path: `:${USER_SELECTOR}/${USER_DETAIL_PATH}`,
        loadChildren: () => import('./detail/user-detail.module').then((m) => m.UserDetailModule),
        resolve: {
            [USER_DATA_ATTRIBUTE_NAME]: UserResolverService,
            breadcrumb: UserBreadcrumbResolverService,
            title: UserTitleResolverService,
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
export class UserOverviewRoutingModule {}
