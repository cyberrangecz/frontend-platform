import { Observable, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

/**
 * Derives the disabled state of an action that must also stay disabled while a request is in flight.
 *
 * @param alwaysDisabled Whether the action is disabled regardless of any request.
 * @returns Emits true while the action is always disabled or a request is in flight.
 */
export type DisabledWhileBusy = (alwaysDisabled: boolean) => Observable<boolean>;

/**
 * Hands out disabled-state derivations over one busy stream, one generation at a time.
 * Controls and table rows are rebuilt on every data refresh, and the component library keeps
 * their disabled streams subscribed until its injector is destroyed. Starting a new generation
 * completes every stream of the previous one, so subscriptions do not pile up on the busy stream.
 */
export class BusyGuard {
    private readonly generationEnded$ = new Subject<void>();

    /**
     * @param busy$ Emits true while a request that blocks the guarded actions is in flight.
     */
    constructor(private readonly busy$: Observable<boolean>) {}

    /**
     * Ends the streams of the current generation and starts a new one.
     *
     * @returns The derivation for the actions of the new generation.
     */
    renew(): DisabledWhileBusy {
        this.release();
        return (alwaysDisabled) =>
            this.busy$.pipe(
                map((busy) => busy || alwaysDisabled),
                takeUntil(this.generationEnded$),
            );
    }

    /**
     * Ends the streams of the current generation.
     */
    release(): void {
        this.generationEnded$.next();
    }
}
