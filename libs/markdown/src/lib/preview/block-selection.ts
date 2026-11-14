/** A source range of markdown. */
export interface SourceSpan {
    readonly start: number;
    readonly end: number;
}

/** A selection inside a text, as offsets from its start. */
export interface TextSelection {
    readonly anchor: number;
    readonly head: number;
}

/** Which way a selection grows past the edge of the text being edited. */
export type SelectionDirection = 'previous' | 'next';

/** The smallest range holding both spans. */
export function coveringSpan(first: SourceSpan, second: SourceSpan): SourceSpan {
    return { start: Math.min(first.start, second.start), end: Math.max(first.end, second.end) };
}

/** The block next to a span in a direction, or undefined past the first or last block. */
export function neighbourOf<T extends SourceSpan>(blocks: readonly T[], span: SourceSpan, direction: SelectionDirection): T | undefined {
    return direction === 'previous' ? blocks.filter((block) => block.end <= span.start).at(-1) : blocks.find((block) => block.start >= span.end);
}

/**
 * The selection after a text grows from `previousStart` to cover `grown`: the old selection keeps
 * its place in the source and its head moves to the grown edge in the direction.
 */
export function grownSelection(selection: TextSelection, previousStart: number, grown: SourceSpan, direction: SelectionDirection): TextSelection {
    return {
        anchor: selection.anchor + previousStart - grown.start,
        head: direction === 'previous' ? 0 : grown.end - grown.start,
    };
}

/** The selection of a pointer drag from one block to another over their covering span: the whole blocks between them. */
export function draggedSelection(origin: SourceSpan, target: SourceSpan, covering: SourceSpan): TextSelection {
    const forward = target.start >= origin.start;
    return forward ? { anchor: origin.start - covering.start, head: target.end - covering.start } : { anchor: origin.end - covering.start, head: target.start - covering.start };
}
