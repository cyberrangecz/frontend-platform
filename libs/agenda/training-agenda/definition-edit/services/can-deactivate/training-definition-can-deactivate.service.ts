import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TrainingDefinitionEditOverviewComponent } from '../../components/training-definition-edit-overview.component';

@Injectable()
/**
 * Route guard determining if navigation outside of training definition edit page should proceed
 */
export class TrainingDefinitionCanDeactivate {
    constructor(private dialog: MatDialog) {}

    canDeactivate(
        component: TrainingDefinitionEditOverviewComponent,
    ): Observable<boolean> | Promise<boolean> | boolean {
        if (component.canDeactivate()) {
            return true;
        }
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Unsaved Changes',
                'There are unsaved changes in training definition, authors or levels. Do you really want to leave without saving?',
                'Cancel',
                'Leave',
            ),
        });
        return dialogRef.afterClosed().pipe(map((result) => result === SentinelDialogResultEnum.CONFIRMED));
    }
}
