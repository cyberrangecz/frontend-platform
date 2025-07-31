import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
    SentinelUserAssignComponent,
    SentinelUserAssignService,
} from '@sentinel/components/user-assign';
import { OrganizersAssignService } from '../../services/state/organizers-assign/organizers-assign.service';
import { TrainingTypeEnum } from '@crczp/training-model';
import { CommonTrainingInstanceEditService } from '../../services/state/edit/common-training-instance-edit.service';
import { TRAINING_TYPE_TOKEN } from '../training-type-token';
import { SentinelControlsComponent } from '@sentinel/components/controls';
import { MatIcon } from '@angular/material/icon';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { MatError } from '@angular/material/input';
import { AsyncPipe } from '@angular/common';
import { TrainingInstanceEditComponent } from '../training-instance-edit/training-instance-edit.component';
import { MatDivider } from '@angular/material/divider';
import { TrainingInstanceEditOverviewComponent } from '../training-instance-edit-overview.component';
import { LinearTrainingInstanceEditService } from '../../services/state/edit/linear-training-instance-edit.service';

@Component({
    selector: 'crczp-linear-training-instance-edit-overview',
    templateUrl: '../training-instance-edit-overview.component.html',
    styleUrls: ['../training-instance-edit-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelControlsComponent,
        MatIcon,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatExpansionPanelContent,
        MatIcon,
        MatError,
        AsyncPipe,
        TrainingInstanceEditComponent,
        MatDivider,
        SentinelUserAssignComponent,
    ],
    providers: [
        {
            provide: CommonTrainingInstanceEditService,
            useClass: LinearTrainingInstanceEditService,
        },
        {
            provide: SentinelUserAssignService,
            useClass: OrganizersAssignService,
        },
        { provide: TRAINING_TYPE_TOKEN, useValue: TrainingTypeEnum.LINEAR },
    ],
})
export class LinearTrainingInstanceEditOverviewComponent extends TrainingInstanceEditOverviewComponent {}
