import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CanDeactivateFn } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { of } from 'rxjs';
import { map, take } from 'rxjs/operators';

/**
 * Builds a route guard that lets navigation proceed while the component reports nothing
 * pending, and otherwise asks the user to confirm abandoning the unsaved work.
 *
 * @param hasNothingPending Reports whether the component may be left without asking.
 * @param message Body of the confirmation dialog, naming what would be lost.
 * @returns {CanDeactivateFn} Guard resolving to true when navigation may proceed.
 */
export function createUnsavedChangesGuard<T>(
    hasNothingPending: (component: T) => boolean,
    message: string
): CanDeactivateFn<T> {
    return (component) => {
        if (hasNothingPending(component)) {
            return of(true);
        }
        const dialogRef = inject(MatDialog).open(
            SentinelConfirmationDialogComponent,
            {
                data: new SentinelConfirmationDialogConfig(
                    'Unsaved changes',
                    message,
                    'Cancel',
                    'Leave'
                ),
            }
        );
        return dialogRef
            .afterClosed()
            .pipe(
                take(1),
                map((result) => result === SentinelDialogResultEnum.CONFIRMED)
            );
    };
}
