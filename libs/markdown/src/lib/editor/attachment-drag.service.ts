import { Injectable } from '@angular/core';
import { AttachmentMetadata } from '../attachment/attachment-source';

/** What an in-page drag carries: a stored material to inline, or the range of the markdown source holding a reference to move. */
export type AttachmentDrag =
    | { readonly kind: 'material'; readonly material: AttachmentMetadata }
    | { readonly kind: 'source'; readonly from: number; readonly to: number };

const ATTACHMENT_DRAG_TYPE = 'application/x-crczp-attachment';

/**
 * Hands an attachment dragged inside the page from its drag source to the drop target. The drag
 * data names only its kind, so nothing outside the page receives reference markdown.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentDragService {
    private current: AttachmentDrag | null = null;

    start(event: DragEvent, drag: AttachmentDrag): void {
        const transfer = event.dataTransfer;
        if (!transfer) {
            return;
        }
        this.current = drag;
        transfer.setData(ATTACHMENT_DRAG_TYPE, drag.kind);
        transfer.effectAllowed = drag.kind === 'material' ? 'copy' : 'move';
    }

    /** The attachment an in-page drag carries, or null for a drag that began anywhere else. */
    dragOf(event: DragEvent): AttachmentDrag | null {
        return event.dataTransfer?.types.includes(ATTACHMENT_DRAG_TYPE) ? this.current : null;
    }
}

/** Whether a drag carries files from outside the browser. */
export function carriesFiles(event: DragEvent): boolean {
    return event.dataTransfer?.types.includes('Files') ?? false;
}
