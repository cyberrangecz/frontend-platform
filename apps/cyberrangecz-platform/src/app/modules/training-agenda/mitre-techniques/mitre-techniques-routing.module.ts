import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {MitreTechniquesComponent} from '@crczp/training-agenda/mitre-techniques';

const routes: Routes = [
    {
        path: '',
        component: MitreTechniquesComponent,
    },
];

/**
 * Routing for training definition mitre techniques
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class MitreTechniquesRoutingModule {}
