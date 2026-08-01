import { createUnsavedChangesGuard } from '@crczp/routing-commons';
import { TrainingDefinitionEditOverviewComponent } from './training-definition-edit-overview.component';

/**
 * Route guard determining if navigation outside of training definition edit page should proceed
 */
export const canDeactivateTrainingDefinition =
    createUnsavedChangesGuard<TrainingDefinitionEditOverviewComponent>(
        (component) => component.canDeactivate(),
        'There are unsaved changes in training definition, authors or levels. Do you really want to leave without saving?'
    );
