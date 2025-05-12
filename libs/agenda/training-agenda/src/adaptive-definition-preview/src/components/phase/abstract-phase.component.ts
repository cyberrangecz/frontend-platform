import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { AbstractPhaseTypeEnum, Phase } from '@crczp/training-model';

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
 */
@Component({
    selector: 'crczp-abstract-phase',
    templateUrl: './abstract-phase.component.html',
    styleUrls: ['./abstract-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbstractPhaseComponent {
    @Input() phase: Phase;

    @Output() next: EventEmitter<void> = new EventEmitter();
    phaseTypes = AbstractPhaseTypeEnum;

    onNext(): void {
        this.next.emit();
    }
}
