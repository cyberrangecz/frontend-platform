import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { map } from 'rxjs/operators';
import { TrainingInstanceEditOverviewComponent } from './training-instance-edit-overview.component';
import { MatDialog } from '@angular/material/dialog';
import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

/**
 * Route guard determining if navigation outside of training instance edit page should proceed
 */

export const canDeactivateTrainingInstance: CanDeactivateFn<
    TrainingInstanceEditOverviewComponent
> = (component) => {
    if (component.canRefreshOrLeave()) {
        return true;
    }

    const dialogRef = inject(MatDialog).open(
        SentinelConfirmationDialogComponent,
        {
            data: new SentinelConfirmationDialogConfig(
                'Unsaved Changes',
                'There are unsaved changes in training instance or organizers. Do you really want to leave?',
                'Cancel',
                'Leave'
            ),
        }
    );
    return dialogRef
        .afterClosed()
        .pipe(map((result) => result === SentinelDialogResultEnum.CONFIRMED));
};
