import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export abstract class DividerPositionSynchronizerService {
    /**
     * Notify everyone that the divider position has changed
     *
     * @param ratio - the new position of the divider in range (0, 1)
     * */
    public abstract emitDividerChange(ratio: number): void;

    /**
     * Get observable of the divider position
     */
    public abstract getDividerPosition$(): Observable<number>;

    /**
     * Get the current divider position
     */
    public abstract getDividerPosition(): number;
}
