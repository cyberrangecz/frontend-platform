/**
 * Axis view-model slice.
 *
 * Y-axis row count is implied by `trainees.length` on the live view-model
 * (or `placeholders.length` on the skeleton); the axis VM carries only
 * the X-axis bounds and the date-prefix toggle that controls whether the
 * label format includes the day prefix when the instance spans midnight.
 */
export interface AxisVm {
    readonly startMs: number;
    readonly endMs: number;
    readonly spansMidnight: boolean;
}
