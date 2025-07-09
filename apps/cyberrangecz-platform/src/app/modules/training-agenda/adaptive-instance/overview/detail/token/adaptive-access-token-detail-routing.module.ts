import {RouterModule, Routes} from '@angular/router';
import {NgModule} from '@angular/core';
import {AccessTokenDetailComponent} from '@crczp/training-agenda/instance-access-token';

const routes: Routes = [
    {
        path: '',
        component: AccessTokenDetailComponent,
    },
];

/**
 * Routing module for access token detail module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class AdaptiveAccessTokenDetailRoutingModule {}
