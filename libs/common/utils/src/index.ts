import { DateUtils } from './utils/functions/date-utils';
import { NavBuilder } from './utils/functions/nav-builder';
import { ProvisionUtil } from './utils/functions/property-provision';
import { DocumentUtils } from './utils/functions/document-utils';
import { TRAINING_TYPE_TOKEN } from './types/training-type-token';

export * from './rxjs/unique';
export * from './rxjs/tresholdBufferPipe';
export * from './utils/classes/loading-tracker';
export * from './service/error-handling/error-handler.service';
export * from './service/error-handling/notification.service';
export * from './pipes/title-case-except.pipe';
export * from './service/synchronization/divider-position/persistent-divider-position-synchronizer.service';
export * from './service/synchronization/divider-position/divider-position-synchronizer.service';
export * from './service/pagination/pagination-storage.service';
export * from './service/progress/file-upload-progress.service';
export * from './service/api/polling.service';
export * from './types/config';
export * from './types/sentinel-auth-config.zod';
export {
    NavAgendaConfig,
    NavAgendaContainerConfig,
} from './utils/functions/nav-builder';

export const Utils = {
    Date: DateUtils,
    NavBar: NavBuilder,
    Provision: ProvisionUtil,
    Document: DocumentUtils,
};

export const Injection = {
    TrainingType: TRAINING_TYPE_TOKEN,
};
