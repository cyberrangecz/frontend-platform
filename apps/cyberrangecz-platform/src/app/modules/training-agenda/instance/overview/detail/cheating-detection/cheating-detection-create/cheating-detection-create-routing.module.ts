import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {CheatingDetectionEditComponent} from '@crczp/training-agenda/instance-cheating-detection-edit';

const routes: Routes = [
    {
        path: '',
        component: CheatingDetectionEditComponent,
    },
];

/**
 * Routing module for training instance progress
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class CheatingDetectionEditRoutingModule {}
