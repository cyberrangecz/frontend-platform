import {Injectable} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {UrlTree} from '@angular/router';
import {
    SentinelConfirmationDialogComponent,
    SentinelConfirmationDialogConfig,
    SentinelDialogResultEnum,
} from '@sentinel/components/dialogs';
import {Observable, of} from 'rxjs';
import {map, take} from 'rxjs/operators';
import {MicroserviceEditOverviewComponent} from '../components/microservice-edit-overview.component';

/**
 * CanDeactivate service for microservice-registration state component.
 * Usage described in @link https://angular.io/api/router/CanDeactivate
 */
@Injectable()
export class MicroserviceEditCanDeactivate {
    constructor(private dialog: MatDialog) {}

    canDeactivate(
        component: MicroserviceEditOverviewComponent,
    ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
        if (component.canDeactivate()) {
            return of(true);
        }
        const dialogData = new SentinelConfirmationDialogConfig(
            'Unsaved changes',
            'There are some unsaved changes. Do you want to leave without saving?',
            'Cancel',
            'Leave',
        );
        const dialogRef = this.dialog.open(SentinelConfirmationDialogComponent, { data: dialogData });
        return dialogRef.afterClosed().pipe(
            take(1),
            map((result) => result === SentinelDialogResultEnum.CONFIRMED),
        );
    }
}
