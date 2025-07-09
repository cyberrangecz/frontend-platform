import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {GroupEditCanDeactivate, GroupEditOverviewComponent} from '@crczp/user-and-group-agenda/group-edit';

const routes: Routes = [
    {
        path: '',
        component: GroupEditOverviewComponent,
        canDeactivate: [GroupEditCanDeactivate],
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class GroupEditRoutingModule {}
