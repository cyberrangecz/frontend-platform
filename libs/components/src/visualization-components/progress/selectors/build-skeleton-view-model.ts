import { isSameDay } from 'date-fns';
import { TrainingInstance } from '@crczp/training-model';
import {
    SKELETON_MAX_BAR_DURATION_MS,
    SKELETON_MIN_BAR_DURATION_MS,
    SKELETON_OFFSET_FRACTIONS,
    SYNTHETIC_AXIS_WINDOW_MS,
} from '../config/skeleton.config';
import { AxisVm, PlaceholderRowVm, SkeletonViewModel } from '../types/view-model.types';

/**
 * Inputs to the skeleton view-model assembler.
 *
 *  - `rowCount`: number of placeholder rows to generate. Callers pass
 *    `SKELETON_ROW_COUNT` from `config/skeleton.config.ts` for the
 *    default population; this assembler does not apply a fallback.
 *  - `seed`: reserved for signature stability. The current implementation
 *    derives placeholder geometry purely from `rowIndex` and does not
 *    consult this value. Kept so a future variant can reintroduce per-
 *    mount randomisation without a breaking signature change.
 *  - `mountNowMs`: wall-clock timestamp captured once by the feed when
 *    its instance signal was bound. Anchors the synthetic axis window,
 *    placeholder left edges, and the engine-driven right-edge animation.
 *    The view-model is stable for the lifetime of the feed binding — no
 *    per-tick recomposition.
 *  - `instance`: prefetched instance, when available. When non-null its
 *    `startTime`/`endTime` provide the real axis bounds; when null the
 *    synthetic ±SYNTHETIC_AXIS_WINDOW_MS window is used.
 */
export interface BuildSkeletonViewModelInput {
    readonly rowCount: number;
    readonly seed: number;
    readonly mountNowMs: number;
    readonly instance: TrainingInstance | null;
}

/**
 * Composes the `SkeletonViewModel` envelope.
 *
 * Generates `rowCount` placeholder rows with deterministic starting offsets
 * inside the configured min/max range. Offsets cycle through
 * `SKELETON_OFFSET_FRACTIONS` keyed by `rowIndex % fractions.length`, so
 * placeholders are stable across renders without any RNG. Axis bounds come
 * from the instance when present, otherwise a synthetic window centred on
 * `mountNowMs`. The view-model carries no per-tick fields — bar right-edges
 * and the current-time marker animate via the rendering engine from
 * `axis.mountNowMs` to `axis.endMs`.
 *
 * @param input - Row count, seed (currently unused, kept for signature
 *                stability), mount-time snapshot, and optional prefetched
 *                instance.
 * @returns Skeleton view-model ready for rendering.
 */
export function buildSkeletonViewModel(
    input: BuildSkeletonViewModelInput,
): SkeletonViewModel {
    const { rowCount, mountNowMs, instance } = input;

    const axis: AxisVm = buildAxis(mountNowMs, instance);
    const placeholders: readonly PlaceholderRowVm[] = buildPlaceholders(
        rowCount,
        mountNowMs,
    );

    return {
        mode: 'skeleton',
        axis,
        placeholders,
    };
}

/**
 * Builds the axis slice. Uses real instance bounds when available;
 * otherwise falls back to a symmetric synthetic window centred on
 * `mountNowMs`. The mount-time snapshot is carried through unchanged so
 * downstream builders can anchor engine-driven motion to it.
 *
 * @param mountNowMs - Wall-clock timestamp at feed binding.
 * @param instance   - Prefetched instance, or `null` when not yet available.
 * @returns Axis view-model with `startMs`, `endMs`, `mountNowMs`, and the
 *          `spansMidnight` flag.
 */
function buildAxis(
    mountNowMs: number,
    instance: TrainingInstance | null,
): AxisVm {
    if (instance !== null) {
        const startMs = instance.startTime.getTime();
        const endMs = instance.endTime.getTime();
        return {
            startMs,
            endMs,
            mountNowMs,
            spansMidnight: !isSameDay(instance.startTime, instance.endTime),
        };
    }

    return {
        startMs: mountNowMs - SYNTHETIC_AXIS_WINDOW_MS,
        endMs: mountNowMs + SYNTHETIC_AXIS_WINDOW_MS,
        mountNowMs,
        spansMidnight: false,
    };
}

/**
 * Builds the placeholder rows. Each row's `startMs` is offset back from
 * `mountNowMs` by a deterministic fraction-scaled duration. Right edges
 * are not encoded on rows — bar growth animates from `axis.mountNowMs`
 * to `axis.endMs` in the bars builder.
 *
 * @param rowCount   - Number of placeholder rows to generate.
 * @param mountNowMs - Wall-clock timestamp anchoring each left edge.
 * @returns Readonly array of placeholder row view-models.
 */
function buildPlaceholders(
    rowCount: number,
    mountNowMs: number,
): readonly PlaceholderRowVm[] {
    const placeholders: PlaceholderRowVm[] = [];
    const span = SKELETON_MAX_BAR_DURATION_MS - SKELETON_MIN_BAR_DURATION_MS;

    for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
        const fraction =
            SKELETON_OFFSET_FRACTIONS[
                rowIndex % SKELETON_OFFSET_FRACTIONS.length
            ] ?? 0;
        const offsetMs = SKELETON_MIN_BAR_DURATION_MS + fraction * span;

        placeholders.push({
            rowIndex,
            startMs: mountNowMs - offsetMs,
        });
    }

    return placeholders;
}
