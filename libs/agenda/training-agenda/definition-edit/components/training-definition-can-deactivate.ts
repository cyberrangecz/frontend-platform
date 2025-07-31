import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingDefinitionEditOverviewComponent } from './training-definition-edit-overview.component';

/**
 * Route guard determining if navigation outside of training definition edit page should proceed
 */
export function canDeactivateTrainingDefinition(
    component: TrainingDefinitionEditOverviewComponent
): Observable<boolean> | Promise<boolean> | boolean {
    if (component.canDeactivate()) {
        return true;
    }
    const dialogRef = inject(MatDialog).open(
        SentinelConfirmationDialogComponent,
        {
            data: new SentinelConfirmationDialogConfig(
                'Unsaved Changes',
                'There are unsaved changes in training definition, authors or levels. Do you really want to leave without saving?',
                'Cancel',
                'Leave'
            ),
        }
    );
    return dialogRef
        .afterClosed()
        .pipe(map((result) => result === SentinelDialogResultEnum.CONFIRMED));
}
