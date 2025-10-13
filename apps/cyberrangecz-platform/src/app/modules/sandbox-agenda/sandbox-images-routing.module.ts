import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImagesPageComponent } from '@crczp/sandbox-agenda/sandbox-images';
import { SandboxApiModule } from '@crczp/sandbox-api';

const routes: Routes = [
    {
        path: '',
        component: ImagesPageComponent,
    },
];

/**
 * Sandbox images overview routing
 */
@NgModule({
    imports: [RouterModule.forChild(routes), SandboxApiModule],
    exports: [RouterModule],
})
export class SandboxImagesRoutingModule {}
