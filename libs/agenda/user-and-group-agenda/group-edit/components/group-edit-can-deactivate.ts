import { createUnsavedChangesGuard } from '@crczp/routing-commons';
import { GroupEditOverviewComponent } from './group-edit-overview.component';

/**
 * Route guard determining if navigation outside of group state page should proceed
 */
export const canDeactivateGroup =
    createUnsavedChangesGuard<GroupEditOverviewComponent>(
        (component) => component.canDeactivate(),
        'There are some unsaved changes. Do you want to leave without saving?'
    );
