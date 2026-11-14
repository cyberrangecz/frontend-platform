import { ChangeDetectionStrategy, Component, computed, forwardRef, inject, Injector, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MarkdownEditingLock } from './markdown-editing-lock';
import { MarkdownEditorDialogComponent, MarkdownEditorDialogData } from './markdown-editor-dialog.component';
import { MarkdownEditorFrameComponent } from './markdown-editor-frame.component';

/** Share of the viewport the expanded editor covers on each axis. */
const EXPANDED_VIEWPORT_SHARE = '90dvw';
const EXPANDED_VIEWPORT_HEIGHT_SHARE = '90dvh';

/** Panel class the expanded editor's styles hook onto. */
const EXPANDED_PANEL_CLASS = 'editor-dialog-panel';

/**
 * Markdown editor usable with reactive and template-driven forms. The frame's expand button opens the
 * editor alone in a large dialog that edits the same value. Content projected as
 * `[crczpMarkdownLabel]` fills the header.
 */
@Component({
    selector: 'crczp-markdown-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MarkdownEditorFrameComponent],
    providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => MarkdownEditorComponent), multi: true }],
    templateUrl: './markdown-editor.component.html',
    styleUrl: './markdown-editor.component.scss',
    host: { '(focusout)': 'onTouched()' },
})
export class MarkdownEditorComponent implements ControlValueAccessor {
    private readonly dialog = inject(MatDialog);
    private readonly injector = inject(Injector);
    private readonly lock = inject(MarkdownEditingLock, { optional: true });

    /** Title of the expanded editor header. */
    readonly label = input('Content');

    protected readonly markdown = signal('');
    private readonly disabledByForm = signal(false);
    protected readonly disabled = computed(() => this.disabledByForm() || (this.lock?.locked() ?? false));

    private onChange: (markdown: string) => void = () => undefined;
    protected onTouched: () => void = () => undefined;

    writeValue(markdown: string | null): void {
        this.markdown.set(markdown ?? '');
    }

    registerOnChange(onChange: (markdown: string) => void): void {
        this.onChange = onChange;
    }

    registerOnTouched(onTouched: () => void): void {
        this.onTouched = onTouched;
    }

    setDisabledState(disabled: boolean): void {
        this.disabledByForm.set(disabled);
    }

    /** Takes an edit from the frame or the expanded dialog into the value and the form control. */
    protected edit(markdown: string): void {
        if (markdown !== this.markdown()) {
            this.markdown.set(markdown);
            this.onChange(markdown);
        }
    }

    protected expand(): void {
        const data: MarkdownEditorDialogData = {
            title: this.label(),
            markdown: this.markdown,
            edit: (markdown) => this.edit(markdown),
            readonly: this.disabled,
        };
        const dialogRef = this.dialog.open(MarkdownEditorDialogComponent, {
            data,
            width: EXPANDED_VIEWPORT_SHARE,
            maxWidth: EXPANDED_VIEWPORT_SHARE,
            height: EXPANDED_VIEWPORT_HEIGHT_SHARE,
            maxHeight: EXPANDED_VIEWPORT_HEIGHT_SHARE,
            panelClass: EXPANDED_PANEL_CLASS,
            autoFocus: false,
            injector: this.injector,
        });
        dialogRef.afterClosed().subscribe(() => this.onTouched());
    }
}
