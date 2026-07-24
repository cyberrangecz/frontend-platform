import { DateUtils } from './utils/functions/date-utils';
import { NavBuilder } from './utils/functions/nav-builder';
import { ProvisionUtil } from './utils/functions/property-provision';
import { DocumentUtils } from './utils/functions/document-utils';
import {
    INSTANCE_ID_TOKEN,
    TRAINING_TYPE_TOKEN,
} from './utils/classes/injection-tokens';
import { LevelTypeUtils } from './utils/functions/level-type-utils';
import { ArrayUtils } from './utils/functions/array-utils';
import { SetUtils } from './utils/functions/set-utils';
import { ObjectUtils } from './utils/functions/object-utils';
import { ColorUtils } from './utils/functions/color-utils';
import { StringUtils } from './utils/functions/string-utils';

export * from './rxjs/unique';
export * from './rxjs/tresholdBufferPipe';
export * from './utils/classes/loading-tracker';
export * from './service/error-handling/error-handler.service';
export * from './service/error-handling/notification.service';
export * from './pipes/title-case-except.pipe';

export * from './service/pagination/pagination-model';
export * from './service/pagination/pagination-storage.service';
export * from './service/progress/file-upload-progress.service';
export * from './service/api/polling.service';
export * from './types/config';
export * from './types/unit-values';
export * from './types/sentinel-auth-config.zod';
export * from './types/type-utils';
export * from './directives/overflow-tooltip.directive';
export * from './directives/click-outside';
export type {
    NavAgendaConfig,
    NavAgendaContainerConfig,
} from './utils/functions/nav-builder';
export type { CategoricalColorPair } from './utils/functions/color-utils';

export const Utils = {
    Date: DateUtils,
    NavBar: NavBuilder,
    Provision: ProvisionUtil,
    Document: DocumentUtils,
    LevelType: LevelTypeUtils,
    Array: ArrayUtils,
    Set: SetUtils,
    Object: ObjectUtils,
    Color: ColorUtils,
    String: StringUtils,
};

export const InjectionTokens = {
    TrainingType: TRAINING_TYPE_TOKEN,
    TrainingInstanceId: INSTANCE_ID_TOKEN,
};
