/**
 * Skeleton placeholder row. The chart paints a fixed number of these
 * with the documented growing-bar animation while bars source is empty.
 *
 * `startMs` and `targetEndMs` define the animation's beginning and final
 * positions. Both timestamps live within the axis bounds carried on the
 * skeleton view-model.
 */
export interface PlaceholderRowVm {
    readonly rowIndex: number;
    readonly startMs: number;
    readonly targetEndMs: number;
}
