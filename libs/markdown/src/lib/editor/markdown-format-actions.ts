import { Prec } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

/**
 * One formatting control. Its markdown matches the Sentinel markdown editor
 * of the level edit page, so content written in either editor reads the same in the other.
 */
export interface MarkdownFormatAction {
    readonly icon: string;
    readonly label: string;
    /** CodeMirror key binding, such as `Mod-b`. */
    readonly key?: string;
    /** The binding as the tooltip names it. */
    readonly keyLabel?: string;
    /** Markdown that replaces the selected text. */
    readonly replace: (selected: string) => string;
    /** Length of the mark the caret steps over when the action wraps an empty selection. */
    readonly wrapMarkLength?: number;
    /** Keeps a non-empty selection selected over the markdown that replaced it. */
    readonly selectsInsertion?: boolean;
}

function wrapping(mark: string): Pick<MarkdownFormatAction, 'replace' | 'wrapMarkLength'> {
    return { replace: (selected) => `${mark}${selected}${mark}`, wrapMarkLength: mark.length };
}

function listing(prefix: string): Pick<MarkdownFormatAction, 'replace' | 'selectsInsertion'> {
    return { replace: (selected) => selected.split('\n').map((line) => prefix + line).join('\n'), selectsInsertion: true };
}

function codeOf(selected: string): string {
    if (!selected.includes('\n')) {
        return `\`${selected}\``;
    }
    const nonEmptyLines = selected.split('\n').filter((line) => line !== '');
    return nonEmptyLines.length <= 1 ? `\`${nonEmptyLines[0] ?? ''}\`` : `\`\`\`\n${selected}\n\`\`\``;
}

function linkOf(selected: string): string {
    if (selected.length === 0) {
        return '[text](url)';
    }
    return selected.startsWith('http://') || selected.startsWith('https://') ? `[text](${selected})` : `[${selected}](url)`;
}

/** Heading levels offered by the heading control, each prefixing the selection with its marks. */
export const HEADING_ACTIONS: readonly (MarkdownFormatAction & { readonly level: number })[] = [1, 2, 3, 4, 5, 6].map(
    (level) => ({
        level,
        icon: 'format_size',
        label: `Heading ${level}`,
        key: level <= 3 ? `Mod-Alt-${level}` : undefined,
        keyLabel: level <= 3 ? `Ctrl+Alt+${level}` : undefined,
        replace: (selected: string) => `${'#'.repeat(level)} ${selected}`,
    }),
);

/** Every formatting control after the heading control, in toolbar order. */
export const FORMAT_ACTIONS: readonly MarkdownFormatAction[] = [
    { icon: 'format_bold', label: 'Add bold text', key: 'Mod-b', keyLabel: 'Ctrl+B', ...wrapping('**') },
    { icon: 'format_italic', label: 'Add italic text', key: 'Mod-i', keyLabel: 'Ctrl+I', ...wrapping('*') },
    { icon: 'strikethrough_s', label: 'Add strikethrough text', key: 'Mod-Shift-x', keyLabel: 'Ctrl+Shift+X', ...wrapping('~~') },
    {
        icon: 'format_quote',
        label: 'Add a quote',
        key: 'Mod-Shift-.',
        keyLabel: 'Ctrl+Shift+.',
        replace: (selected) => (selected === '' ? '> ' : selected.split('\n').map((line) => `> ${line}`).join('\n')),
    },
    { icon: 'code', label: 'Insert code', key: 'Mod-e', keyLabel: 'Ctrl+E', replace: codeOf, wrapMarkLength: 1 },
    { icon: 'link', label: 'Add a link', key: 'Mod-k', keyLabel: 'Ctrl+K', replace: linkOf },
    { icon: 'format_list_bulleted', label: 'Add a bullet list', key: 'Mod-Shift-8', keyLabel: 'Ctrl+Shift+8', ...listing('* ') },
    { icon: 'format_list_numbered', label: 'Add a numbered list', key: 'Mod-Shift-7', keyLabel: 'Ctrl+Shift+7', ...listing('1. ') },
    { icon: 'check_box', label: 'Add a task list', key: 'Mod-Shift-9', keyLabel: 'Ctrl+Shift+9', ...listing('* [ ] ') },
    {
        icon: 'menu_open',
        label: 'Add collapsible section',
        replace: (selected) => `\n<details>\n<summary>Click to expand or collapse</summary>\n\n${selected}\n</details>`,
    },
    {
        icon: 'table_chart',
        label: 'Add a table',
        replace: (selected) => `${selected}\n\n| header | header |\n| ------ | ------ |\n| cell | cell |\n| cell | cell |\n\n`,
    },
];

/** The markdown an action puts in place of a selection, and the selection the editor holds afterwards. */
export interface FormatOutcome {
    readonly insert: string;
    readonly anchor: number;
    readonly head: number;
}

/**
 * Applies an action to the selection `from`..`to` holding `selected`. The caret lands between the
 * marks of an emptily wrapped selection, the insertion stays selected for actions that keep their
 * selection, and otherwise the caret lands after the insertion.
 */
export function formatOutcomeOf(action: MarkdownFormatAction, from: number, to: number, selected: string): FormatOutcome {
    const insert = action.replace(selected);
    if (from === to && action.wrapMarkLength) {
        return { insert, anchor: from + action.wrapMarkLength, head: from + action.wrapMarkLength };
    }
    const end = from + insert.length;
    return action.selectsInsertion && from !== to ? { insert, anchor: from, head: end } : { insert, anchor: end, head: end };
}

/** Replaces the editor's main selection with the action's markdown and focuses the editor; a read-only editor stays as it is. */
export function applyFormatAction(view: EditorView, action: MarkdownFormatAction): void {
    if (view.state.readOnly) {
        return;
    }
    const { from, to } = view.state.selection.main;
    const { insert, anchor, head } = formatOutcomeOf(action, from, to, view.state.sliceDoc(from, to));
    view.dispatch({ changes: { from, to, insert }, selection: { anchor, head }, scrollIntoView: true, userEvent: 'input.format' });
    view.focus();
}

/** Key bindings of every formatting control that has one, ahead of CodeMirror's own bindings. */
export const formatKeymap = Prec.high(
    keymap.of(
        [...HEADING_ACTIONS, ...FORMAT_ACTIONS]
            .filter((action) => action.key)
            .map((action) => ({
                key: action.key,
                preventDefault: true,
                run: (view: EditorView) => {
                    applyFormatAction(view, action);
                    return true;
                },
            })),
    ),
);

/** Tooltip text of a control: its label, followed by its key binding when it has one. */
export function tooltipOf(action: MarkdownFormatAction): string {
    return action.keyLabel ? `${action.label} (${action.keyLabel})` : action.label;
}
