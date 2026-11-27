import { CaretPlacement } from '../editor/block-source-editor.component';
import { TextSelection } from './block-selection';
import { detailsSummaryOf, isDetailsClosing, MarkdownBlock } from '../model/markdown-blocks';

/** The source range of the markdown open for editing, and the text it held when it opened. */
export interface EditSession {
    readonly id: number;
    readonly start: number;
    readonly end: number;
    readonly initialText: string;
    readonly caret: CaretPlacement;
    /** Selection the editor opens with, over the source range, in place of the caret. */
    readonly selection?: TextSelection;
}

/** A rendered block, and whether it renders as attachments alone. */
export interface PreviewBlock {
    readonly type: 'block';
    readonly key: string;
    readonly block: MarkdownBlock;
    readonly mediaOnly: boolean;
}

/** The open source range, in place of the blocks it spans. */
export interface PreviewEditor {
    readonly type: 'editor';
    readonly key: string;
    readonly session: EditSession;
}

/** A collapsible section: the block opening it, the entries inside it, and the block closing it when there is one. */
export interface PreviewDetails {
    readonly type: 'details';
    readonly key: string;
    readonly opener: PreviewBlock;
    readonly summary: string;
    readonly children: readonly (PreviewBlock | PreviewEditor)[];
}

/** One entry of the previewed content. */
export type PreviewItem = PreviewBlock | PreviewEditor | PreviewDetails;

/**
 * Gathers the entries between a block opening a collapsible section and the block closing it
 * into one section. The closing block is dropped, since the section draws its own end, unless it
 * is open for editing, when it follows the section; a section left open runs to the end.
 */
export function groupDetails(entries: readonly (PreviewBlock | PreviewEditor)[]): PreviewItem[] {
    const items: PreviewItem[] = [];
    let section: { opener: PreviewBlock; summary: string; children: (PreviewBlock | PreviewEditor)[] } | null = null;
    const closeSection = (): void => {
        if (section) {
            items.push({ type: 'details', key: `details:${section.opener.key}`, ...section });
            section = null;
        }
    };
    for (const entry of entries) {
        if (section) {
            if (entry.type === 'block' && isDetailsClosing(entry.block.token.raw)) {
                closeSection();
            } else if (entry.type === 'editor' && isDetailsClosing(entry.session.initialText)) {
                closeSection();
                items.push(entry);
            } else {
                section.children.push(entry);
            }
            continue;
        }
        const summary = entry.type === 'block' ? detailsSummaryOf(entry.block.token) : null;
        if (entry.type === 'block' && summary !== null) {
            section = { opener: entry, summary, children: [] };
        } else {
            items.push(entry);
        }
    }
    closeSection();
    return items;
}
