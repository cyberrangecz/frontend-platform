import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {
    TrainingDefinitionDetailBreadcrumbResolver,
    TrainingDefinitionDetailTitleResolver,
    TrainingDefinitionResolver,
} from '@crczp/training-agenda/resolvers';

/**
 * Module containing components and providers for training definition detail agenda
 */
@NgModule({
    imports: [CommonModule],
    declarations: [],
    providers: [
        TrainingDefinitionResolver,
        TrainingDefinitionDetailTitleResolver,
        TrainingDefinitionDetailBreadcrumbResolver,
    ],
})
export class TrainingDefinitionDetailComponentsModule {

}
