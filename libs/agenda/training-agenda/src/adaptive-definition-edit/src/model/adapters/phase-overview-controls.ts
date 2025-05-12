import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import { defer, Observable, of } from 'rxjs';
import { PhaseEditService } from '../../services/state/phase/phase-edit.service';
import { AbstractPhaseTypeEnum, QuestionnaireTypeEnum } from '@crczp/training-model';

/**
 * @dynamic
 */
export class PhaseOverviewControls {
    static readonly ADD_ACTION_ID = 'add';
    static readonly DELETE_ACTION_ID = 'delete';
    static readonly ADD_TRAINING_PHASE_ID = 'add_training_phase';
    static readonly ADD_ADAPTIVE_QUESTIONNAIRE_PHASE_ID = 'add_adaptive_questionnaire_phase';
    static readonly ADD_GENERAL_QUESTIONNAIRE_PHASE_ID = 'add_general_questionnaire_phase';
    static readonly ADD_INFO_PHASE_ID = 'add_info_phase';
    static readonly ADD_ACCESS_PHASE_ID = 'add_access_phase';

    static create(service: PhaseEditService, deleteDisabled$: Observable<boolean>): SentinelControlItem[] {
        return [
            new SentinelExpandableControlItem(
                this.ADD_ACTION_ID,
                'Add',
                'primary',
                of(false),
                this.createAddExpandedMenuControlButtons(service),
            ),
            new SentinelControlItem(
                this.DELETE_ACTION_ID,
                'Delete',
                'warn',
                deleteDisabled$,
                defer(() => service.deleteSelected()),
            ),
        ];
    }

    private static createAddExpandedMenuControlButtons(service: PhaseEditService): SentinelControlMenuItem[] {
        return [
            new SentinelControlMenuItem(
                this.ADD_TRAINING_PHASE_ID,
                'Training Phase',
                'primary',
                of(false),
                defer(() => service.add(AbstractPhaseTypeEnum.Training)),
                'transform',
            ),
            new SentinelControlMenuItem(
                this.ADD_INFO_PHASE_ID,
                'Info Phase',
                'primary',
                of(false),
                defer(() => service.add(AbstractPhaseTypeEnum.Info)),
                'info',
            ),
            new SentinelControlMenuItem(
                this.ADD_ADAPTIVE_QUESTIONNAIRE_PHASE_ID,
                'Adaptive Questionnaire',
                'primary',
                of(false),
                defer(() => service.add(AbstractPhaseTypeEnum.Questionnaire, QuestionnaireTypeEnum.Adaptive)),
                'help_center',
            ),
            new SentinelControlMenuItem(
                this.ADD_GENERAL_QUESTIONNAIRE_PHASE_ID,
                'General Questionnaire',
                'primary',
                of(false),
                defer(() => service.add(AbstractPhaseTypeEnum.Questionnaire, QuestionnaireTypeEnum.General)),
                'help',
            ),
            new SentinelControlMenuItem(
                this.ADD_ACCESS_PHASE_ID,
                'Access Phase',
                'primary',
                of(false),
                defer(() => service.add(AbstractPhaseTypeEnum.Access)),
                'settings',
            ),
        ];
    }
}
