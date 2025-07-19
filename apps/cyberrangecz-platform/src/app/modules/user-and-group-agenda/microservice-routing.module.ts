import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MicroserviceOverviewComponent} from '@crczp/user-and-group-agenda/microservice-overview';
import {MicroserviceEditCanDeactivate} from "@crczp/user-and-group-agenda/microservice-registration";
import {PATHS} from "../../paths";

const routes: Routes = [
    {
        path: '',
        component: MicroserviceOverviewComponent,
    },
    {
        path: PATHS.ACTION.CREATE,
        loadComponent: () =>
            import('@crczp/user-and-group-agenda/microservice-registration').then((m) => m.MicroserviceEditComponent),
        data: {
            breadcrumb: 'Registration',
            title: 'Microservice Registration',
        },
        canDeactivate: [MicroserviceEditCanDeactivate],
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class MicroserviceRoutingModule {
}
