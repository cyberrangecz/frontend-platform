import { Component, input, output } from '@angular/core';
import { Hint } from '@crczp/training-model';
import { MatTooltip } from '@angular/material/tooltip';
import { MatButton } from '@angular/material/button';

@Component({
    selector: 'crczp-answer-form-hints',
    templateUrl: './answer-form-hints.component.html',
    styleUrl: './answer-form-hints.component.css',
    imports: [MatTooltip, MatButton],
})
export class AnswerFormHintsComponent {
    readonly isSolutionRevealed = input.required<boolean>();
    readonly hints = input.required<Hint[]>();

    readonly hintRevealed = output<Hint>();
    readonly solutionRevealed = output<void>();
}
