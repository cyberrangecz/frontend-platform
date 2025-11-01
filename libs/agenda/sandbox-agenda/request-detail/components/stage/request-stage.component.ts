import {
    ChangeDetectionStrategy,
    Component,
    input,
    signal,
} from '@angular/core';
import { StageAdapter } from '../../model/adapters/stage-adapter';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { RequestStageStateIndicator } from './header/request-stage-state-indicator.component';
import { AllocationStageDetailComponent } from './detail/allocation-stage-detail.component';
import { RequestStageTypeMapper } from '@crczp/sandbox-model';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { ClickOutsideDirective, Utils } from '@crczp/utils';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Component of request stage basic info
 */
@Component({
    selector: 'crczp-request-stage',
    templateUrl: './request-stage.component.html',
    styleUrls: ['./request-stage.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatCardContent,
        RequestStageStateIndicator,
        AllocationStageDetailComponent,
        MatIcon,
        DatePipe,
        ClickOutsideDirective,
        MatTooltip,
    ],
})
export class RequestStageComponent {
    stage = input.required<StageAdapter>();
    height = input<string>('auto');
    infoExpanded = signal<boolean>(false);
    protected readonly window = window;

    getOrderNumber(stage: StageAdapter) {
        if (!stage?.type) {
            return 0;
        }
        return RequestStageTypeMapper.toOrderOfExecution(stage.type) + 1;
    }

    openRepoInNewTab($event: PointerEvent, repoUrl: string) {
        $event.preventDefault();
        $event.stopPropagation();
        this.window.open(repoUrl, '_blank', 'noopener');
    }

    protected getDurationText(start: Date, end: Date) {
        return Utils.Date.timeBetweenDatesSimple(start, end);
    }
}
