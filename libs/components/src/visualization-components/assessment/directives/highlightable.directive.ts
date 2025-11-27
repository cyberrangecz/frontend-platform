import {Directive, OnDestroy} from '@angular/core';
import {HighlightService} from '../services/highlight.service';
import {AssessmentEmiAnswers, AssessmentParticipant, AssessmentQuestion} from '@crczp/visualization-model';

/**
 * Class representing behaviour of highlightable components
 */
@Directive()
export abstract class HighlightableDirective implements OnDestroy {
    isAlive = true;
    abstract question: AssessmentQuestion;

    protected constructor(private highlightService: HighlightService) {
        this.subscribeEvents();
    }

    ngOnDestroy(): void {
        this.isAlive = false;
    }

    /**
     * Clears highlighting of the component
     */
    clear(): void {
        this.highlightService.clear();
    }

    /**
     * Highlights selected answer
     * @param participant
     * @param event mouse click event
     */
    highlight(participant: AssessmentParticipant, event: MouseEvent): void {
        event.stopPropagation();
        this.highlightService.highlight(participant);
    }

    private subscribeEvents() {
        this.highlightService.highlightedParticipant$.subscribe((participant) => {
            if (participant) {
                this.unhighlightParticipant();
                this.highlightParticipant(participant);
            } else if (participant === null) {
                this.unhighlightParticipant();
            }
        });
    }

    private highlightParticipant(selectedParticipant: AssessmentParticipant) {
        this.question.answers.forEach((answer) => {
            if (answer.participants) {
                answer.participants.forEach((participant) => {
                    if (participant.id === selectedParticipant.id) {
                        participant.isHighlighted = true;
                    }
                });
            } else {
                (answer as AssessmentEmiAnswers).options.forEach((option) =>
                    option.participants.forEach((participant) => {
                        if (participant.id === selectedParticipant.id) {
                            participant.isHighlighted = true;
                        }
                    }),
                );
            }
        });
    }

    private unhighlightParticipant() {
        this.question.answers.forEach((answer) => {
            if (answer.participants) {
                answer.participants.forEach((participant) => (participant.isHighlighted = false));
            } else {
                (answer as AssessmentEmiAnswers).options.forEach((option) =>
                    option.participants.forEach((participant) => (participant.isHighlighted = false)),
                );
            }
        });
    }
}
