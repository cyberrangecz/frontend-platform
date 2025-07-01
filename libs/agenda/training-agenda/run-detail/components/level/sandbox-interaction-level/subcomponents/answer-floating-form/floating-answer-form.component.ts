import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {MatCard} from "@angular/material/card";
import {MatIcon} from "@angular/material/icon";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatFormField, MatInput} from "@angular/material/input";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'crczp-floating-answer-form',
    templateUrl: './floating-answer-form.component.html',
    styleUrl: './floating-answer-form.component.css',
    imports: [
        MatIcon,
        MatButton,
        MatFormField,
        MatCard,
        FormsModule,
        MatIconButton,
        MatInput
    ]
})
export class FloatingAnswerFormComponent implements OnChanges {
    @Input() placeholder: string = 'Answer';
    @Input() buttonLabel: string = 'Submit';

    @Output() answerSubmit: EventEmitter<string> = new EventEmitter();

    answer: string;

    constructor() {
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.answer = '';
        }
    }

    /**
     * Calls service to check whether the answer is correct
     */
    submitAnswer(): void {
        this.answerSubmit.emit(this.answer);
        this.scrollToTop();
    }

    /**
     * Checks whether user confirmed answer input with Enter
     * @param event keydown event
     */
    keyboardSubmitAnswer(event: KeyboardEvent): void {
        if (event.key === 'Enter') {
            this.submitAnswer();
        }
    }

    private scrollToTop(): void {
        window.scrollTo({
            left: 0,
            top: 0,
        });
    }
}
