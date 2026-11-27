/**
 * How many of `total` equally sized footer buttons fit in `room` pixels when each one costs
 * `buttonWidth` plus `gap`. When they do not all fit, one slot goes to the overflow button that
 * holds the rest, so the count is one less than the slots available.
 */
export function visibleButtonCount(room: number, buttonWidth: number, gap: number, total: number): number {
    const slots = Math.floor(room / (buttonWidth + gap));
    return slots >= total ? total : Math.max(0, slots - 1);
}
