import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { InfoPhase } from '@crczp/training-model';

@Component({
    selector: 'crczp-info-phase-detail',
    templateUrl: './info-phase-detail.component.html',
    styleUrls: ['./info-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('bodyExpansion', [
            state('false, void', style({ height: '0px', visibility: 'hidden' })),
            state('true', style({ height: '*', visibility: 'visible' })),
            transition('true <=> false, void => false', animate('225ms ease')),
        ]),
    ],
})
export class InfoPhaseDetailComponent {
    @Input() phase: InfoPhase;
    @Input() expanded = false;

    toggle(): void {
        this.expanded = !this.expanded;
    }
}
