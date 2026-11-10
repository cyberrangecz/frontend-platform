import { Directive, ElementRef, inject, output, signal } from '@angular/core';
import { carriesFiles } from './attachment-drag.service';

/** Files dropped on a target. */
export interface FileDrop {
    readonly files: readonly File[];
}

/**
 * Accepts files dragged in from outside the browser. Reports whether such a drag is over the
 * element, and emits the files once they are dropped; every other drag passes through untouched.
 */
@Directive({
    selector: '[crczpFileDropTarget]',
    exportAs: 'fileDropTarget',
    host: {
        '(dragover)': 'onDragOver($event)',
        '(dragleave)': 'onDragLeave($event)',
        '(drop)': 'onDrop($event)',
    },
})
export class FileDropTargetDirective {
    private readonly element: HTMLElement = inject(ElementRef).nativeElement;
    private readonly fileOver = signal(false);

    readonly active = this.fileOver.asReadonly();
    readonly filesDropped = output<FileDrop>();

    protected onDragOver(event: DragEvent): void {
        if (!carriesFiles(event) || !event.dataTransfer) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
        this.fileOver.set(true);
    }

    protected onDragLeave(event: DragEvent): void {
        const enteredInside = event.relatedTarget instanceof Node && this.element.contains(event.relatedTarget);
        if (!enteredInside) {
            this.fileOver.set(false);
        }
    }

    protected onDrop(event: DragEvent): void {
        if (!carriesFiles(event) || !event.dataTransfer) {
            return;
        }
        event.preventDefault();
        this.fileOver.set(false);
        this.filesDropped.emit({ files: Array.from(event.dataTransfer.files) });
    }
}
