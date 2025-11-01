import {
    ChangeDetectionStrategy,
    Component,
    QueryList,
    ViewChildren,
} from '@angular/core';
import { RequestStagesService } from '../services/state/request-stages.service';
import { RequestDetailComponent } from './shared/request-detail.component';
import { AllocationStagesConcreteService } from '../services/state/allocation-stages-concrete.service';
import { StagesDetailPollRegistry } from '../services/state/detail/stages-detail-poll-registry.service';
import { RequestStageComponent } from './stage/request-stage.component';
import { MatIcon } from '@angular/material/icon';
import { MatCard } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { AnsibleOutputsService } from '../services/state/detail/ansible-outputs.service';
import { TerraformOutputsService } from '../services/state/detail/terraform-outputs.service';

@Component({
    selector: 'crczp-allocation-request-detail',
    templateUrl: './shared/request-detail.component.html',
    styleUrls: ['./shared/request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: RequestStagesService,
            useClass: AllocationStagesConcreteService,
        },
        StagesDetailPollRegistry,
        AnsibleOutputsService,
        TerraformOutputsService,
    ],
    imports: [
        RequestStageComponent,
        MatIcon,
        MatCard,
        MatIconButton,
        AsyncPipe,
    ],
})
export class AllocationRequestDetailComponent extends RequestDetailComponent {
    @ViewChildren(RequestStageComponent)
    requestStages: QueryList<RequestStageComponent>;

    constructor() {
        super();
    }
}
