import { createUnsavedChangesGuard } from '@crczp/routing-commons';
import { PoolEditComponent } from './pool-edit.component';

/**
 * Route guard determining if navigation outside of pool edit page should proceed
 */
export const canDeactivatePool = createUnsavedChangesGuard<PoolEditComponent>(
    (component) => component.canDeactivate(),
    'There are some unsaved changes. Do you want to leave without saving?'
);
