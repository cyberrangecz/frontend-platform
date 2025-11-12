import {
    ChangeDetectionStrategy,
    Component,
    InjectionToken,
    Injector,
    runInInjectionContext,
} from '@angular/core';
import { RequestStagesService } from '../services/state/request-stages.service';
import { RequestDetailComponent } from './request-detail.component';
import { AllocationStagesConcreteService } from '../services/state/allocation-stages-concrete.service';
import { StagesDetailPollRegistry } from '../services/state/detail/stages-detail-poll-registry.service';
import { RequestStageComponent } from './stage/request-stage.component';
import { MatIcon } from '@angular/material/icon';
import { MatCard } from '@angular/material/card';
import { MatIconButton } from '@angular/material/button';
import { AsyncPipe } from '@angular/common';
import { RequestStageType } from '@crczp/sandbox-model';
import { OutputsService } from '../services/state/detail/outputs.service';

@Component({
    selector: 'crczp-allocation-request-detail',
    templateUrl: './request-detail.component.html',
    styleUrls: ['./request-detail.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {
            provide: RequestStagesService,
            useClass: AllocationStagesConcreteService,
        },
        StagesDetailPollRegistry,
        {
            provide: AllocationRequestDetailComponent.STAGE_LOG_SERVICES_TOKEN,
            useFactory: (injector: Injector) => ({
                [RequestStageType.TERRAFORM_ALLOCATION]: runInInjectionContext(
                    injector,
                    () =>
                        new OutputsService(
                            RequestStageType.TERRAFORM_ALLOCATION,
                        ),
                ),
                [RequestStageType.NETWORKING_ANSIBLE_ALLOCATION]:
                    runInInjectionContext(
                        injector,
                        () =>
                            new OutputsService(
                                RequestStageType.NETWORKING_ANSIBLE_ALLOCATION,
                            ),
                    ),
                [RequestStageType.USER_ANSIBLE_ALLOCATION]:
                    runInInjectionContext(
                        injector,
                        () =>
                            new OutputsService(
                                RequestStageType.USER_ANSIBLE_ALLOCATION,
                            ),
                    ),
            }),
            deps: [Injector],
        },
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
    public static readonly STAGE_LOG_SERVICES_TOKEN = new InjectionToken<
        Record<number, OutputsService>
    >('STAGE_LOG_SERVICES_TOKEN');

    constructor() {
        super();
    }
}
