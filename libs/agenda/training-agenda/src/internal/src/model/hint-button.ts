/**
 * Class representing hint button in a training level.
 */
import { Hint } from '@crczp/training-model';
import { BehaviorSubject, Observable } from 'rxjs';

export class HintButton {
    private disabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    disabled$: Observable<boolean> = this.disabledSubject$.asObservable();
    hint: Hint;

    constructor(disabled: boolean, hint: Hint) {
        this.disabledSubject$.next(disabled);
        this.hint = hint;
    }

    disable(): void {
        this.disabledSubject$.next(true);
    }

    enable(): void {
        this.disabledSubject$.next(false);
    }
}
