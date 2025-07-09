import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {AssessmentParticipant} from '@crczp/visualization-model';

/**
 * Service holding state of highlighted participants
 */
@Injectable()
export class HighlightService {
    private highlightedParticipantSubject$ = new BehaviorSubject<AssessmentParticipant>(undefined);
    /**
     * Selected participant whose answers should be highlighted
     */
    highlightedParticipant$ = this.highlightedParticipantSubject$.asObservable();

    /**
     * Selects participant to highlight his answers
     * @param participant participant whose answers should be highlighted
     */
    highlight(participant: AssessmentParticipant): void {
        if (this.isAlreadyHighlighted(participant)) {
            this.highlightedParticipantSubject$.next(undefined);
        } else {
            this.highlightedParticipantSubject$.next(participant);
        }
    }

    /**
     * Clears highlighted player
     */
    clear(): void {
        this.highlightedParticipantSubject$.next(null);
    }

    private isAlreadyHighlighted(participant: AssessmentParticipant): boolean {
        const highlighted = this.highlightedParticipantSubject$.getValue();
        return highlighted && participant.id === highlighted.id;
    }
}
