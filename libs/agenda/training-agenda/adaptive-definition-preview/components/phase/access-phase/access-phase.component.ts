import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AccessPhase } from '@crczp/training-model';

@Component({
    selector: 'crczp-access-phase',
    templateUrl: './access-phase.component.html',
    styleUrls: ['./access-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessPhaseComponent {
    @Input() phase: AccessPhase;
}
