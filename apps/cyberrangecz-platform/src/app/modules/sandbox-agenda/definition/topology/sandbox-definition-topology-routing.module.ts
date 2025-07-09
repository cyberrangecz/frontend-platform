import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';
import {SandboxTopologyComponent} from '@crczp/sandbox-agenda/topology';
import {SANDBOX_DEFINITION_DATA_ATTRIBUTE_NAME} from '@crczp/sandbox-agenda';
import {SandboxDefinitionResolver} from '@crczp/sandbox-agenda/resolvers';

const routes: Routes = [
    {
        path: '',
        component: SandboxTopologyComponent,
        resolve: {
            [SANDBOX_DEFINITION_DATA_ATTRIBUTE_NAME]: SandboxDefinitionResolver,
        },
    },
];

/**
 * Routing module for sandbox instance topology module
 */
@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
})
export class SandboxDefinitionTopologyRoutingModule {}
