import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdaptiveDefinitionEditOverviewComponent } from '../../components/adaptive-definition-edit-overview.component';

@Injectable()
/**
 * Route guard determining if navigation outside of training definition edit page should proceed
 */
export class AdaptiveDefinitionCanDeactivate {
    constructor(private dialog: MatDialog) {}

    canDeactivate(
        component: AdaptiveDefinitionEditOverviewComponent,
    ): Observable<boolean> | Promise<boolean> | boolean {
        if (component.canDeactivate()) {
            return true;
        }
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Unsaved Changes',
                'There are unsaved changes in training definition, authors or phase. Do you really want to leave without saving?',
                'Cancel',
                'Leave',
            ),
        });
        return dialogRef.afterClosed().pipe(map((result) => result === SentinelDialogResultEnum.CONFIRMED));
    }
}
