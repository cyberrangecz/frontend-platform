import {NgModule} from "@angular/core";
import {SandboxAgendaSharedProvidersModule} from "../sandbox-agenda-shared-providers.module";
import {SandboxApiModule} from "@crczp/sandbox-api";
import {SandboxDefinitionOverviewRoutingModule} from "./sandbox-definition-overview-routing.module";
import {SandboxDefinitionOverviewComponent} from "@crczp/sandbox-agenda/sandbox-definition-overview";

@NgModule({
    imports: [
        SandboxAgendaSharedProvidersModule,
        SandboxApiModule,
        SandboxDefinitionOverviewComponent,
        SandboxDefinitionOverviewRoutingModule,
    ],
})
export class SandboxDefinitionOverviewModule {
}
