import { RedirectCommand, UrlTree } from '@angular/router';
import { map, OperatorFunction } from 'rxjs';

/**
 * Turns an absent value into a redirect, cancelling the in-flight navigation
 * in favour of the given destination.
 *
 * @param destination Route to navigate to when the source emits `null` or `undefined`.
 */
export function redirectWhenAbsent<T>(
    destination: UrlTree,
): OperatorFunction<T | null | undefined, T | RedirectCommand> {
    return map((value) => value ?? new RedirectCommand(destination));
}
