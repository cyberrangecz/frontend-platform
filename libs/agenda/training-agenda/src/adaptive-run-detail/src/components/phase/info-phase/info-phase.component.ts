import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { InfoPhase } from '@crczp/training-model';

@Component({
    selector: 'crczp-info-phase',
    templateUrl: './info-phase.component.html',
    styleUrls: ['./info-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoPhaseComponent {
    @Input() phase: InfoPhase;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();

    onNext(): void {
        this.next.emit();
    }
}
