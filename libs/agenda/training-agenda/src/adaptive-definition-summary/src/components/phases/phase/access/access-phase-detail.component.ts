import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { AccessPhase } from '@crczp/training-model';

@Component({
    selector: 'crczp-access-phase-detail',
    templateUrl: './access-phase-detail.component.html',
    styleUrls: ['./access-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('bodyExpansion', [
            state('false, void', style({ height: '0px', visibility: 'hidden' })),
            state('true', style({ height: '*', visibility: 'visible' })),
            transition('true <=> false, void => false', animate('225ms ease')),
        ]),
    ],
})
export class AccessPhaseDetailComponent {
    @Input() phase: AccessPhase;
    @Input() expanded = false;

    toggle(): void {
        this.expanded = !this.expanded;
    }
}
