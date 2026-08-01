import { createUnsavedChangesGuard } from '@crczp/routing-commons';
import { MicroserviceEditOverviewComponent } from './microservice-edit-overview.component';

/**
 * Route guard determining if navigation outside of microservice-registration state page should proceed
 */
export const canDeactivateMicroservice =
    createUnsavedChangesGuard<MicroserviceEditOverviewComponent>(
        (component) => component.canDeactivate(),
        'There are some unsaved changes. Do you want to leave without saving?'
    );
