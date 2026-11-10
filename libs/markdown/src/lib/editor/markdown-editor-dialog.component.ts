import { ChangeDetectionStrategy, Component, inject, Signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogClose } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MarkdownEditorFrameComponent } from './markdown-editor-frame.component';

/** The value an expanded editor edits and where its edits go, shared with the editor that opened it. */
export interface MarkdownEditorDialogData {
    readonly title: string;
    readonly markdown: Signal<string>;
    readonly edit: (markdown: string) => void;
    readonly readonly: Signal<boolean>;
}

/** The editor frame filling the dialog below a header holding the title and a control that closes it. */
@Component({
    selector: 'crczp-markdown-editor-dialog',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MarkdownEditorFrameComponent, MatButtonModule, MatDialogClose, MatIconModule, MatTooltipModule],
    templateUrl: './markdown-editor-dialog.component.html',
    styleUrl: './markdown-editor-dialog.component.scss',
})
export class MarkdownEditorDialogComponent {
    protected readonly data = inject<MarkdownEditorDialogData>(MAT_DIALOG_DATA);
}
