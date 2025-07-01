import {NgModule, Optional, SkipSelf,} from '@angular/core';
import {CommonModule} from '@angular/common';
import {TopologyApi} from './services/topology-api.service';
import {TopologyMapper} from './services/topology-mapper.service';
import {TopologyLoadingService} from './services/topology-loading.service';
import {TopologyErrorService} from './services/topology-error.service';

@NgModule({
    imports: [CommonModule],
    providers: [
        TopologyApi,
        TopologyMapper,
        TopologyLoadingService,
        TopologyErrorService,
    ],
})
export class TopologyApiModule {
    constructor(@Optional() @SkipSelf() parentModule: TopologyApiModule) {
        if (parentModule) {
            throw new Error(
                'TopologyApiModule is already loaded. Import it only once in single module hierarchy.'
            );
        }
    }
}
