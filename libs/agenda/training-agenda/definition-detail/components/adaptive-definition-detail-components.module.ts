import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {
    AdaptiveDefinitionDetailBreadcrumbResolver,
    AdaptiveDefinitionDetailTitleResolver,
    AdaptiveDefinitionResolver,
} from '@crczp/training-agenda/resolvers';

/**
 * Module containing components and providers for adaptive training definition detail agenda
 */
@NgModule({
    imports: [CommonModule],
    declarations: [],
    providers: [
        AdaptiveDefinitionResolver,
        AdaptiveDefinitionDetailTitleResolver,
        AdaptiveDefinitionDetailBreadcrumbResolver,
    ],
})
export class AdaptiveDefinitionDetailComponentsModule {

}
