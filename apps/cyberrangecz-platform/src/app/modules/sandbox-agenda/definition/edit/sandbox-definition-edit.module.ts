import {NgModule} from '@angular/core';
import {SandboxDefinitionEditRoutingModule} from './sandbox-definition-edit-routing.module';
import {SandboxDefinitionEditComponent} from "@crczp/sandbox-agenda/sandbox-definition-edit";

@NgModule({
    imports: [SandboxDefinitionEditComponent, SandboxDefinitionEditRoutingModule],
})
export class SandboxDefinitionEditModule {
}
