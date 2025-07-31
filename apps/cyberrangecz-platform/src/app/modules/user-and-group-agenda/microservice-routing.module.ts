import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MicroserviceOverviewComponent } from '@crczp/user-and-group-agenda/microservice-overview';
import { UserAndGroupApiModule } from '@crczp/user-and-group-api';
import { ValidRouterConfig } from '@crczp/routing-commons';
import { canDeactivateMicroservice } from '@crczp/user-and-group-agenda/microservice-registration';

const routes: ValidRouterConfig<'microservice'> = [
    {
        path: '',
        component: MicroserviceOverviewComponent,
    },
    {
        path: 'create',
        loadComponent: () =>
            import(
                '@crczp/user-and-group-agenda/microservice-registration'
            ).then((m) => m.MicroserviceEditComponent),
        data: {
            breadcrumb: 'Registration',
            title: 'Microservice Registration',
        },
        canDeactivate: [canDeactivateMicroservice],
    },
];

/**
 * Routing module training definition overview
 */
@NgModule({
    imports: [RouterModule.forChild(routes), UserAndGroupApiModule],
    exports: [RouterModule],
})
export class MicroserviceRoutingModule {}
