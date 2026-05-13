import { TrainingInstance } from '@crczp/training-model';
import { SkeletonViewModel } from '../types/skeleton-view-model.types';

/**
 * Inputs to the skeleton view-model assembler.
 *
 *  - `rowCount`: number of placeholder rows to generate. Defaults to
 *    `SKELETON_ROW_COUNT` from `config/ui.config.ts`.
 *  - `seed`: deterministic seed for placeholder bar widths and offsets.
 *    Typically derived from the instance identifier so placeholders are
 *    stable per mount.
 *  - `now`: current tick. Drives the synthetic axis fallback and the
 *    current-time marker.
 *  - `instance`: prefetched instance, when available. When non-null its
 *    `startTime`/`endTime` provide the real axis bounds; when null the
 *    synthetic ±SYNTHETIC_AXIS_WINDOW_MS window is used.
 */
export interface BuildSkeletonViewModelInput {
    readonly rowCount: number;
    readonly seed: number;
    readonly now: number;
    readonly instance: TrainingInstance | null;
}

/**
 * Composes the `SkeletonViewModel` envelope.
 *
 * Generates `rowCount` placeholder rows with seeded random starting
 * offsets and target widths inside the configured min/max range. The
 * axis bounds come from the instance when present, otherwise the
 * synthetic window. The current-time marker is always shown in
 * skeleton mode.
 */
export function buildSkeletonViewModel(
    _input: BuildSkeletonViewModelInput,
): SkeletonViewModel {
    throw new Error('not implemented');
}
