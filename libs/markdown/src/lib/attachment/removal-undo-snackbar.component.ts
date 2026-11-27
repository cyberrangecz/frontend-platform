import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_SNACK_BAR_DATA, MatSnackBarAction, MatSnackBarActions, MatSnackBarLabel, MatSnackBarRef } from '@angular/material/snack-bar';

/** What the removal snackbar says and how long its Undo stays offered. */
export interface RemovalUndoSnackbarData {
    readonly message: string;
    readonly durationMilliseconds: number;
}

/** Snackbar announcing a removal, with an Undo action whose ring drains over the time the action stays offered. */
@Component({
    selector: 'crczp-removal-undo-snackbar',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatButton, MatSnackBarLabel, MatSnackBarActions, MatSnackBarAction],
    templateUrl: './removal-undo-snackbar.component.html',
    styleUrl: './removal-undo-snackbar.component.scss',
})
export class RemovalUndoSnackbarComponent {
    protected readonly data = inject<RemovalUndoSnackbarData>(MAT_SNACK_BAR_DATA);
    protected readonly snackBarReference = inject<MatSnackBarRef<RemovalUndoSnackbarComponent>>(MatSnackBarRef);
}
