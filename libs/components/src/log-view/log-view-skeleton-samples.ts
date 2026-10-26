/**
 * Shape of one row of a loading log, in characters of the log font.
 */
export interface LogSkeletonRow {
    /** Characters before the row's rectangle. */
    readonly indent: number;
    /** Width of the row's rectangle; a blank row has none. */
    readonly width: number;
}

const row = (indent: number, width: number): LogSkeletonRow => ({ indent, width });
const BLANK_ROW = row(0, 0);

/**
 * Row shapes of `ansible-playbook` output: starred play, task and handler headings
 * followed by short host results, one of them a nested JSON message.
 */
export const ANSIBLE_SKELETON_SAMPLE: readonly LogSkeletonRow[] = [
    row(0, 79),
    BLANK_ROW,
    row(0, 61),
    row(0, 12),
    row(0, 12),
    BLANK_ROW,
    row(0, 73),
    row(0, 33),
    row(0, 34),
    row(0, 28),
    BLANK_ROW,
    row(0, 54),
    row(0, 17),
    row(0, 18),
    BLANK_ROW,
    row(0, 68),
    row(0, 16),
    row(4, 38),
    row(0, 1),
    BLANK_ROW,
    row(0, 46),
    row(0, 17),
    BLANK_ROW,
];

/**
 * Row shapes of `tofu apply` output: indented planned resources with their attributes,
 * the plan summary, then one progress line per resource and the apply summary.
 */
export const TERRAFORM_SKELETON_SAMPLE: readonly LogSkeletonRow[] = [
    row(2, 55),
    row(2, 52),
    row(6, 37),
    row(6, 36),
    row(6, 27),
    row(4, 1),
    BLANK_ROW,
    row(2, 55),
    row(2, 52),
    row(6, 38),
    row(6, 33),
    row(6, 36),
    row(6, 22),
    row(4, 1),
    BLANK_ROW,
    row(0, 52),
    BLANK_ROW,
    row(0, 50),
    row(0, 84),
    row(0, 47),
    row(0, 68),
    row(0, 82),
    BLANK_ROW,
    row(0, 60),
    BLANK_ROW,
];
