import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MICROSERVICE_NEW_PATH} from '@crczp/user-and-group-agenda';
import {MicroserviceOverviewComponent} from '@crczp/user-and-group-agenda/microservice-overview';

const routes: Routes = [
    {
        path: '',
        component: MicroserviceOverviewComponent,
    },
    {
        path: MICROSERVICE_NEW_PATH,
        loadChildren: () => import('./new/microservice-new.module').then((m) => m.MicroserviceNewModule),
        data: {
            breadcrumb: 'Registration',
            title: 'Microservice Registration',
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
export class MicroserviceOverviewRoutingModule {}
