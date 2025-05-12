import {
    SentinelControlItem,
    SentinelControlMenuItem,
    SentinelExpandableControlItem,
} from '@sentinel/components/controls';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { defer, Observable, of } from 'rxjs';
import { LevelEditService } from '../../services/state/level/level-edit.service';

/**
 * @dynamic
 */
export class LevelOverviewControls {
    static readonly ADD_ACTION_ID = 'add';
    static readonly DELETE_ACTION_ID = 'delete';
    static readonly ADD_TRAINING_LEVEL_ID = 'add_training_level';
    static readonly ADD_ACCESS_LEVEL_ID = 'add_access_level';
    static readonly ADD_ASSESSMENT_LEVEL_ID = 'add_assessment_level';
    static readonly ADD_INFO_LEVEL_ID = 'add_info_level';

    static create(
        service: LevelEditService,
        editMode: boolean,
        deleteDisabled$: Observable<boolean>,
    ): SentinelControlItem[] {
        return [
            new SentinelExpandableControlItem(
                this.ADD_ACTION_ID,
                'Add',
                'primary',
                of(!editMode),
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

    private static createAddExpandedMenuControlButtons(service: LevelEditService): SentinelControlMenuItem[] {
        return [
            new SentinelControlMenuItem(
                this.ADD_TRAINING_LEVEL_ID,
                'Training Level',
                'primary',
                of(false),
                defer(() => service.add(AbstractLevelTypeEnum.Training)),
                'videogame_asset',
            ),
            new SentinelControlMenuItem(
                this.ADD_ACCESS_LEVEL_ID,
                'Access Level',
                'primary',
                of(false),
                defer(() => service.add(AbstractLevelTypeEnum.Access)),
                'settings',
            ),
            new SentinelControlMenuItem(
                this.ADD_ASSESSMENT_LEVEL_ID,
                'Assessment Level',
                'primary',
                of(false),
                defer(() => service.add(AbstractLevelTypeEnum.Assessment)),
                'assignment',
            ),
            new SentinelControlMenuItem(
                this.ADD_INFO_LEVEL_ID,
                'Info Level',
                'primary',
                of(false),
                defer(() => service.add(AbstractLevelTypeEnum.Info)),
                'info',
            ),
        ];
    }
}
