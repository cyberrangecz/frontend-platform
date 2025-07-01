import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AbstractPhaseTypeEnum, Phase } from '@crczp/training-model';

@Component({
    selector: 'crczp-phase-detail',
    templateUrl: './abstract-phase-detail.component.html',
    styleUrls: ['./abstract-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbstractPhaseDetailComponent {
    @Input() phase: Phase;

    readonly AbstractPhaseTypeEnum = AbstractPhaseTypeEnum;
}
