import {NgModule} from '@angular/core';
import {SandboxApiModule} from '@crczp/sandbox-api';
import {SandboxAgendaSharedProvidersModule} from '../sandbox-agenda-shared-providers.module';
import {ImagesPageComponent} from '@crczp/sandbox-agenda/sandbox-images';
import {SandboxImagesOverviewRoutingModule} from './sandbox-images-overview-routing.module';

@NgModule({
    imports: [
        SandboxAgendaSharedProvidersModule,
        SandboxApiModule,
        ImagesPageComponent,
        SandboxImagesOverviewRoutingModule,
    ],
})
export class SandboxImagesOverviewModule {
}
