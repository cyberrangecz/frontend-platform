import { MeasuredSize } from './media-size-limits';

/** Whether a card carries its toolbar and resize handle inside its area: never, always, or when its shown size has room for them. */
export type InsetPolicy = 'never' | 'always' | 'when-fits';

/**
 * Whether a card shown at the given size has room to carry its toolbar and resize handle inside
 * its picture. Both dimensions must reach the needed size; a card whose shown or needed size is
 * not yet measured is given the inset layout.
 */
export function fitsInsetLayout(shown: MeasuredSize | null, needed: MeasuredSize | null): boolean {
    return !shown || !needed || (shown.width >= needed.width && shown.height >= needed.height);
}

/** Whether a card follows the inset layout under its policy. */
export function isInset(policy: InsetPolicy, shown: MeasuredSize | null, needed: MeasuredSize | null): boolean {
    switch (policy) {
        case 'never':
            return false;
        case 'always':
            return true;
        case 'when-fits':
            return fitsInsetLayout(shown, needed);
        default:
            return policy satisfies never;
    }
}
