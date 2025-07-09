import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MitreTechniquesComponent} from '@crczp/training-agenda/mitre-techniques';

const routes: Routes = [
    {
        path: '',
        component: MitreTechniquesComponent,
        data: {
            title: 'MITRE Techniques',
            breadcrumb: 'MITRE Techniques',
            showSwitch: true,
        },
    },
];

/**
 * Routing for training run mitre techniques
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class MitreTechniquesRoutingModule {}
