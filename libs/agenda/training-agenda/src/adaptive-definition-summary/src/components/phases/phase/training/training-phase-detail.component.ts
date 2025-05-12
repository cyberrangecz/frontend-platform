import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TrainingPhase } from '@crczp/training-model';

@Component({
    selector: 'crczp-training-phase-detail',
    templateUrl: './training-phase-detail.component.html',
    styleUrls: ['./training-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('bodyExpansion', [
            state('false, void', style({ height: '0px', visibility: 'hidden' })),
            state('true', style({ height: '*', visibility: 'visible' })),
            transition('true <=> false, void => false', animate('225ms ease')),
        ]),
    ],
})
export class TrainingPhaseDetailComponent {
    @Input() phase: TrainingPhase;
    @Input() expanded = false;

    toggle(): void {
        this.expanded = !this.expanded;
    }

    getMitreTechniques(): string {
        return this.phase.mitreTechniques.map((technique) => technique.techniqueKey).toString();
    }
}
