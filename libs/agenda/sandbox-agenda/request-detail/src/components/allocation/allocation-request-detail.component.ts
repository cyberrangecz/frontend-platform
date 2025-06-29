import { ChangeDetectionStrategy, Component, QueryList, ViewChildren } from '@angular/core';
import { RequestStagesService } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/request-stages.service';
import { RequestDetailComponent } from 'libs/agenda/sandbox-agenda/request-detail/src/components/shared/request-detail.component';
import { AllocationStagesConcreteService } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/allocation-stages-concrete.service';
import { ActivatedRoute } from '@angular/router';
import { StagesDetailPollRegistry } from 'libs/agenda/sandbox-agenda/request-detail/src/services/state/detail/stages-detail-poll-registry.service';
import { RequestStageComponent } from 'libs/agenda/sandbox-agenda/request-detail/src/components/stage/request-stage.component';

@Component({
    selector: 'crczp-allocation-request-detail',
    templateUrl: '../shared/request-detail.component.html',
    styleUrls: ['../shared/request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [{ provide: RequestStagesService, useClass: AllocationStagesConcreteService }, StagesDetailPollRegistry],
})
//implements OnInit, AfterViewInit
export class AllocationRequestDetailComponent extends RequestDetailComponent {
    @ViewChildren(RequestStageComponent) requestStages: QueryList<RequestStageComponent>;

    constructor(
        protected activeRoute: ActivatedRoute,
        protected requestStagesService: RequestStagesService,
        protected stageDetailRegistry: StagesDetailPollRegistry,
    ) {
        super(activeRoute, requestStagesService, stageDetailRegistry);
    }
}
