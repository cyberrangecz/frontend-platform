import { BarWithLag } from '../types/bar.types';
import { LagState } from '../types/lag-state.types';

/**
 * Excludes bars by two orthogonal predicates:
 *
 *  - When `selectedLevelOrder` is non-null, keep only bars whose trainee
 *    is currently on that level. "Currently on level L" means the bar's
 *    level order matches `L` and the bar has neither a completion nor a
 *    run-end timestamp.
 *
 *  - When `lagFilter` is non-empty, exclude bars whose lag classification
 *    is in the set. An empty filter set passes everything through.
 *
 * Both predicates compose multiplicatively; a bar must pass both to be
 * included.
 */
export function filtered(
    _bars: readonly BarWithLag[],
    _selectedLevelOrder: number | null,
    _lagFilter: ReadonlySet<LagState>,
): readonly BarWithLag[] {
    throw new Error('not implemented');
}
