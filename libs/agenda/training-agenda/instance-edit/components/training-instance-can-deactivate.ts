import { createUnsavedChangesGuard } from '@crczp/routing-commons';
import { TrainingInstanceEditOverviewComponent } from './training-instance-edit-overview.component';

/**
 * Route guard determining if navigation outside of training instance edit page should proceed
 */
export const canDeactivateTrainingInstance =
    createUnsavedChangesGuard<TrainingInstanceEditOverviewComponent>(
        (component) => component.canRefreshOrLeave(),
        'There are unsaved changes in training instance or organizers. Do you really want to leave?'
    );
