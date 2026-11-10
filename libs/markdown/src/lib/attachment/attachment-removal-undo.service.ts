import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RemovalUndoSnackbarComponent, RemovalUndoSnackbarData } from './removal-undo-snackbar.component';

const UNDO_DURATION_MS = 6000;

/** Tells the author an attachment left the content and offers to put it back. */
@Injectable({ providedIn: 'root' })
export class AttachmentRemovalUndo {
    private readonly snackBar = inject(MatSnackBar);

    /** Shows the removal in a snackbar; choosing Undo runs the restore action once. */
    offer(restore: () => void, message = 'Attachment removed'): void {
        const data: RemovalUndoSnackbarData = { message, durationMilliseconds: UNDO_DURATION_MS };
        this.snackBar.openFromComponent(RemovalUndoSnackbarComponent, { data, duration: UNDO_DURATION_MS }).onAction().subscribe(restore);
    }
}
