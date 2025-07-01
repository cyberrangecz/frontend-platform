import { Injectable } from '@angular/core';
import { UrlTree } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import { map } from 'rxjs/operators';
import { AdaptiveInstanceEditOverviewComponent } from '../../components/adaptive-instance-edit-overview.component';

/**
 * Route guard determining if navigation outside of training instance edit page should proceed
 */
@Injectable()
export class AdaptiveInstanceCanDeactivate {
    constructor(private dialog: MatDialog) {}

    canDeactivate(
        component: AdaptiveInstanceEditOverviewComponent,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (component.canDeactivate()) {
            return true;
        }

        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, {
            data: new SentinelConfirmationDialogConfig(
                'Unsaved Changes',
                'There are unsaved changes in training instance or organizers. Do you really want to leave?',
                'Cancel',
                'Leave',
            ),
        });
        return dialogRef.afterClosed().pipe(map((result) => result === SentinelDialogResultEnum.CONFIRMED));
    }
}
