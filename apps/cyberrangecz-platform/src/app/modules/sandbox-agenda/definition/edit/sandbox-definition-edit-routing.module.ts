import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SandboxDefinitionEditComponent} from '@crczp/sandbox-agenda/sandbox-definition-edit';

const routes: Routes = [
    {
        path: '',
        component: SandboxDefinitionEditComponent,
    },
];

/**
 * Create sandbox definition routing module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SandboxDefinitionEditRoutingModule {}
