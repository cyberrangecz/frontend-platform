import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';
import { PoolApi, SandboxAllocationUnitsApi, SandboxDefinitionApi, SandboxInstanceApi } from '@crczp/sandbox-api';
import {
    AdaptiveDefinitionApiService,
    AdaptiveInstanceApi,
    AdaptiveRunApi,
    TrainingDefinitionApi,
    TrainingInstanceApi,
    TrainingRunApi,
    UserApi,
} from '@crczp/training-api';
import { TrainingAgendaConfig } from '../../../src/model/training-agenda-config';
import { TrainingErrorHandler } from '../../../src/services/training-error.handler.service';
import { TrainingNavigator } from '../../../src/services/training-navigator.service';
import { TrainingNotificationService } from '../../../src/services/training-notification.service';
import { TrainingAgendaContext } from '../services/context/training-agenda-context.service';
import {
    RunningTrainingRunService
} from '../../../run-detail/src/services/training-run/running/running-training-run.service';
import {
    TrainingDefinitionEditService
} from '../../../definition-edit/src/services/state/edit/training-definition-edit.service';
import { TrainingDefinitionService } from '../../../definition-overview/src/services/state/training-definition.service';
import {
    FileUploadProgressService
} from '../../../definition-overview/src/services/file-upload/file-upload-progress.service';
import { SentinelAuthService } from '@sentinel/auth';
import {
    AdaptiveFileUploadProgressService
} from '../../../adaptive-definition-overview/src/services/file-upload/adaptive-file-upload-progress.service';
import { DefaultPaginationService } from '../services/pagination.service';
import { LevelEditService } from '../../../definition-edit/src/services/state/level/level-edit.service';
import { TopologyApi } from '@crczp/topology-graph';
import {
    RunningAdaptiveRunService
} from '../../../adaptive-run-detail/src/services/adaptive-run/running/running-adaptive-run.service';

export function createErrorHandlerSpy(): jasmine.SpyObj<TrainingErrorHandler> {
    return jasmine.createSpyObj('TrainingErrorHandler', ['emit']);
}

export function createNotificationSpy(): jasmine.SpyObj<TrainingNotificationService> {
    return jasmine.createSpyObj('TrainingNotificationService', ['emit']);
}

export function createLevelEditServiceSpy(): jasmine.SpyObj<LevelEditService> {
    return jasmine.createSpyObj('LevelEditService', [
        'set',
        'getLevelsCount',
        'setActiveLevel',
        'onActiveLevelChanged',
        'getSelected',
        'navigateToLastLevel',
        'navigateToPreviousLevel',
        'add',
        'saveUnsavedLevels',
        'deleteSelected',
        'move',
    ]);
}

export function createPoolApiSpy(): jasmine.SpyObj<PoolApi> {
    return jasmine.createSpyObj('PoolApi', ['getPools', 'getPool', 'getPoolsSandboxes']);
}

export function createTrainingInstanceApiSpy(): jasmine.SpyObj<TrainingInstanceApi> {
    return jasmine.createSpyObj('TrainingInstanceApi', [
        'assignPool',
        'unassignPool',
        'getAll',
        'archive',
        'delete',
        'update',
        'create',
        'getAssociatedTrainingRuns',
        'getAssociatedTrainingRuns',
    ]);
}

export function createAdaptiveInstanceApiSpy(): jasmine.SpyObj<AdaptiveInstanceApi> {
    return jasmine.createSpyObj('AdaptiveInstanceApi', [
        'assignPool',
        'unassignPool',
        'getAll',
        'archive',
        'delete',
        'update',
        'create',
        'getAssociatedTrainingRuns',
    ]);
}

export function createTrainingRunApiSpy(): jasmine.SpyObj<TrainingRunApi> {
    return jasmine.createSpyObj('TrainingRunApi', [
        'nextLevel',
        'finish',
        'submitAnswers',
        'getAccessed',
        'archive',
        'deleteMultiple',
    ]);
}

export function createAdaptiveRunApiSpy(): jasmine.SpyObj<AdaptiveRunApi> {
    return jasmine.createSpyObj('AdaptiveRunApi', [
        'nextLevel',
        'finish',
        'submitAnswers',
        'getAccessed',
        'archive',
        'deleteMultiple',
    ]);
}

export function createTrainingDefinitionApiSpy(): jasmine.SpyObj<TrainingDefinitionApi> {
    return jasmine.createSpyObj('TrainingDefinitionApi', [
        'update',
        'create',
        'createTrainingLevel',
        'createInfoLevel',
        'createAssessmentLevel',
        'getLevel',
        'updateTrainingDefinitionLevels',
        'deleteLevel',
        'getAll',
        'delete',
        'download',
        'clone',
        'changeState',
        'upload',
        'getAllForOrganizer',
    ]);
}

export function createAdaptiveDefinitionApiSpy(): jasmine.SpyObj<AdaptiveDefinitionApiService> {
    return jasmine.createSpyObj('AdaptiveDefinitionApiService', [
        'update',
        'create',
        'createTrainingLevel',
        'createInfoLevel',
        'createAssessmentLevel',
        'getLevel',
        'updateInfoLevel',
        'updateTrainingLevel',
        'updateAssessmentLevel',
        'deleteLevel',
        'getAll',
        'delete',
        'download',
        'clone',
        'changeState',
        'upload',
        'getAllForOrganizer',
    ]);
}

export function createTopologyApiSpy(): jasmine.SpyObj<TopologyApi> {
    return jasmine.createSpyObj('TopologyApi', [
        'getTopology',
        'getVMConsoleUrl',
        'getVMConsolesUrl',
        'establishGuacamoleRemoteConnection',
        'performVMAction',
    ]);
}

export function createSandboxInstanceApiSpy(): jasmine.SpyObj<SandboxInstanceApi> {
    return jasmine.createSpyObj('SandboxInstanceApi', ['getSandbox']);
}

export function createSandboxDefinitionApiSpy(): jasmine.SpyObj<SandboxDefinitionApi> {
    return jasmine.createSpyObj('SandboxDefinitionApi', ['getAll']);
}

export function createSauApi(): jasmine.SpyObj<SandboxAllocationUnitsApi> {
    return jasmine.createSpyObj('SandboxAllocationUnitsApi', ['createCleanupRequest']);
}

export function createUserApiSpy(): jasmine.SpyObj<UserApi> {
    return jasmine.createSpyObj('UserApi', [
        'getDesignersNotInTD',
        'getAuthors',
        'updateAuthors',
        'getOrganizersNotInTI',
        'getOrganizers',
        'updateOrganizers',
    ]);
}

export function createAuthSpy(): jasmine.SpyObj<SentinelAuthService> {
    return jasmine.createSpyObj('SentinelAuthService', ['']);
}

export function createNavigatorSpy(): jasmine.SpyObj<TrainingNavigator> {
    return jasmine.createSpyObj('TrainingNavigator', [
        'toTrainingRunResult',
        'toAdaptiveRunResult',
        'toTrainingDefinitionOverview',
        'toAdaptiveDefinitionOverview',
        'toTrainingDefinitionEdit',
        'toAdaptiveDefinitionEdit',
        'toNewTrainingInstance',
        'toNewAdaptiveInstance',
        'toTrainingInstanceEdit',
        'toAdaptiveInstanceEdit',
        'toTrainingInstanceOverview',
        'toAdaptiveInstanceOverview',
        'toTrainingInstanceEdit',
        'toNewTrainingDefinition',
        'toNewAdaptiveDefinition',
        'toAdaptiveDefinitionPreview',
        'toTrainingDefinitionPreview',
        'toTrainingInstanceProgress',
        'toTrainingInstanceResults',
        'toAdaptiveInstanceResults',
        'toResumeTrainingRun',
        'toResumeAdaptiveRun',
        'toAccessTrainingRun',
        'toAccessAdaptiveRun',
        'toTrainingDefinitionDetail',
        'toAdaptiveDefinitionDetail',
    ]);
}

export function createRouterSpy(): jasmine.SpyObj<Router> {
    return jasmine.createSpyObj('Router', ['navigate']);
}

export function createDialogSpy(): jasmine.SpyObj<MatDialog> {
    return jasmine.createSpyObj('MatDialog', ['open', 'close']);
}

export function createDialogRefSpy(): jasmine.SpyObj<MatDialogRef<any>> {
    return jasmine.createSpyObj(MatDialogRef, ['open', 'close']);
}

export function createRunningTrainingRunServiceSpy(): jasmine.SpyObj<RunningTrainingRunService> {
    return jasmine.createSpyObj('RunningTrainingRunService', ['next', 'init']);
}

export function createRunningAdaptiveRunServiceSpy(): jasmine.SpyObj<RunningAdaptiveRunService> {
    return jasmine.createSpyObj('RunningAdaptiveRunService', ['next', 'init']);
}

export function createContext(): TrainingAgendaContext {
    const config = new TrainingAgendaConfig();
    config.pollingPeriod = 5000;
    config.defaultPaginationSize = 10;
    return new TrainingAgendaContext(config);
}

export function createPaginationServiceSpy(): jasmine.SpyObj<DefaultPaginationService> {
    return jasmine.createSpyObj('DefaultPaginationService', ['setPagination', 'getPagination']);
}

export function createActivatedRouteSpy(): jasmine.SpyObj<ActivatedRoute> {
    return jasmine.createSpyObj('ActivatedRoute', ['']);
}

export function createTrainingDefinitionEditServiceSpy(): jasmine.SpyObj<TrainingDefinitionEditService> {
    return jasmine.createSpyObj('TrainingDefinitionEditService', ['change', 'set']);
}

export function createTrainingDefinitionServiceSpy(): jasmine.SpyObj<TrainingDefinitionService> {
    return jasmine.createSpyObj('TrainingDefinitionService', ['getAll']);
}

export function createFileUploadProgressServiceSpy(): jasmine.SpyObj<FileUploadProgressService> {
    return jasmine.createSpyObj('FileUploadProgressService', ['']);
}

export function createAdaptiveFileUploadProgressServiceSpy(): jasmine.SpyObj<AdaptiveFileUploadProgressService> {
    return jasmine.createSpyObj('AdaptiveFileUploadProgressService', ['']);
}
