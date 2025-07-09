import { Injectable, inject } from '@angular/core';
import {Router} from '@angular/router';
import {GroupApi} from '@crczp/user-and-group-api';
import {Group} from '@crczp/user-and-group-model';
import {BehaviorSubject, Observable, ReplaySubject} from 'rxjs';
import {tap} from 'rxjs/operators';
import {
    UserAndGroupErrorHandler,
    UserAndGroupNavigator,
    UserAndGroupNotificationService
} from '@crczp/user-and-group-agenda';
import {GroupChangedEvent} from '../../model/group-changed-event';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated requests and other operations to modify data.
 * Subscribe to group-overview$ to receive latest data updates.
 */

@Injectable()
export class GroupEditService {
    private api = inject(GroupApi);
    private notificationService = inject(UserAndGroupNotificationService);
    private router = inject(Router);
    private navigator = inject(UserAndGroupNavigator);
    private errorHandler = inject(UserAndGroupErrorHandler);

    private editModeSubject$: BehaviorSubject<boolean> = new BehaviorSubject(false);
    /**
     * True if existing group-overview is edited, false if new one is created
     */
    editMode$: Observable<boolean> = this.editModeSubject$.asObservable();
    private groupSubject$: ReplaySubject<Group> = new ReplaySubject();
    /**
     * Edited group-overview
     */
    group$: Observable<Group> = this.groupSubject$.asObservable();
    private saveDisabledSubject$: BehaviorSubject<boolean> = new BehaviorSubject(true);
    /**
     * True if saving is disabled (for example invalid data), false otherwise
     */
    saveDisabled$: Observable<boolean> = this.saveDisabledSubject$.asObservable();
    private editedGroup: Group;

    /**
     * Sets group-overview to state
     * @param initialGroup group-overview to state
     */
    set(initialGroup: Group): void {
        let group = initialGroup;
        this.setEditMode(group);
        if (group === null || group === undefined) {
            group = new Group();
        }
        this.groupSubject$.next(group);
    }

    /**
     * Handles group-overview state changes. Updates internal state and emits observables
     * @param changeEvent edited group-overview change event
     */
    change(changeEvent: GroupChangedEvent): void {
        this.saveDisabledSubject$.next(!changeEvent.isValid);
        this.editedGroup = changeEvent.group;
    }

    /**
     * Saves edited group-overview, updated related observables or handles error
     */
    save(): Observable<any> {
        return this.editModeSubject$.getValue()
            ? this.update()
            : this.create().pipe(tap(() => this.router.navigate([this.navigator.toGroupOverview()])));
    }

    createAndEdit(): Observable<any> {
        return this.create().pipe(tap((id) => this.router.navigate([this.navigator.toGroupEdit(id)])));
    }

    private setEditMode(group: Group) {
        this.editModeSubject$.next(group !== null && group !== undefined);
    }

    private update() {
        return this.api.update(this.editedGroup).pipe(
            tap(
                () => {
                    this.notificationService.emit('success', 'Group was saved');
                    this.onSaved();
                },
                (err) => this.errorHandler.emit(err, 'Editing group-overview')
            )
        );
    }

    private create(): Observable<number> {
        return this.api.create(this.editedGroup).pipe(
            tap(
                () => {
                    this.notificationService.emit('success', 'Group was created');
                    this.onSaved();
                },
                (err) => this.errorHandler.emit(err, 'Creating group-overview')
            )
        );
    }

    private onSaved() {
        this.editModeSubject$.next(true);
        this.saveDisabledSubject$.next(true);
        this.groupSubject$.next(this.editedGroup);
        this.editedGroup = null;
    }
}
