import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GroupDetailComponent} from '@crczp/user-and-group-agenda/group-detail';

const routes: Routes = [
    {
        path: '',
        component: GroupDetailComponent,
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class GroupDetailRoutingModule {}
