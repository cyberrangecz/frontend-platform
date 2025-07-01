import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {
    AdaptiveInstanceDetailBreadcrumbResolver,
    AdaptiveInstanceDetailTitleResolver,
    AdaptiveInstanceResolver,
} from '@crczp/training-agenda/resolvers';

/**
 * Module containing components and providers for training instance detail agenda
 */
@NgModule({
    imports: [CommonModule],
    declarations: [],
    providers: [
        AdaptiveInstanceResolver,
        AdaptiveInstanceDetailTitleResolver,
        AdaptiveInstanceDetailBreadcrumbResolver,
    ],
})
export class AdaptiveInstanceDetailComponentsModule {

}
