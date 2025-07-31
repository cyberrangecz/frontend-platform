import { inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { UrlTree } from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum
} from '@sentinel/components/dialogs';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { GroupEditOverviewComponent } from './group-edit-overview.component';

/**
 * CanDeactivate service for group-overview state component.
 * Usage described in @link https://angular.io/api/router/CanDeactivate
 */
export function canDeactivateGroup(
    component: GroupEditOverviewComponent
):
    | Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    if (component.canDeactivate()) {
        return true;
    } else {
        const dialogData = new SentinelConfirmationDialogConfig(
            'Unsaved changes',
            'There are some unsaved changes. Do you want to leave without saving?',
            'Cancel',
            'Leave'
        );

        const dialogRef = inject(MatDialog).open(
            SentinelConfirmationDialogComponent,
            { data: dialogData }
        );
        return dialogRef.afterClosed().pipe(
            take(1),
            map((result) => result === SentinelDialogResultEnum.CONFIRMED)
        );
    }
}
