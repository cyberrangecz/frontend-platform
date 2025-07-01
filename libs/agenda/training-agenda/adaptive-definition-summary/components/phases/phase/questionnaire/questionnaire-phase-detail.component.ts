import { animate, state, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QuestionnairePhase, QuestionnaireTypeEnum } from '@crczp/training-model';

@Component({
    selector: 'crczp-questionnaire-phase-detail',
    templateUrl: './questionnaire-phase-detail.component.html',
    styleUrls: ['./questionnaire-phase-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: [
        trigger('bodyExpansion', [
            state('false, void', style({ height: '0px', visibility: 'hidden' })),
            state('true', style({ height: '*', visibility: 'visible' })),
            transition('true <=> false, void => false', animate('225ms ease')),
        ]),
    ],
})
export class QuestionnairePhaseDetailComponent {
    @Input() phase: QuestionnairePhase;
    @Input() expanded = false;

    readonly QuestionnaireTypeEnum = QuestionnaireTypeEnum;

    toggle(): void {
        this.expanded = !this.expanded;
    }

    isAdaptive(): boolean {
        return this.phase.questionnaireType === QuestionnaireTypeEnum.Adaptive;
    }
}
