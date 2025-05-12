import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
    selector: 'crczp-answer-form-hints',
    templateUrl: './answer-form-hints.component.html',
    styleUrl: './answer-form-hints.component.css',
})
export class AnswerFormHintsComponent {
    @Input({ required: true }) isSolutionRevealed$: Observable<boolean>;
    @Input({ required: true }) isLoading$: Observable<boolean>;

    @Output() solutionRevealed: EventEmitter<void> = new EventEmitter();

    /**
     * Calls service to reveal solution
     */
    emitSolutionRevealed(): void {
        this.solutionRevealed.emit();
    }
}
