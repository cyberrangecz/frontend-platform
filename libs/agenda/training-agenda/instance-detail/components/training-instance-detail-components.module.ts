import {CommonModule} from '@angular/common';
import {NgModule} from '@angular/core';
import {
    TrainingInstanceDetailBreadcrumbResolver,
    TrainingInstanceDetailTitleResolver,
    TrainingInstanceResolver,
} from '@crczp/training-agenda/resolvers';

/**
 * Module containing components and providers for training instance detail agenda
 */
@NgModule({
    imports: [CommonModule],
    declarations: [],
    providers: [
        TrainingInstanceResolver,
        TrainingInstanceDetailTitleResolver,
        TrainingInstanceDetailBreadcrumbResolver,
    ],
})
export class TrainingInstanceDetailComponentsModule {

}
