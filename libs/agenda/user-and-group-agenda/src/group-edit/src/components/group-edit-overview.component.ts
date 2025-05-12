import { ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, inject, Output } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    SentinelControlItem,
    SentinelControlItemSignal,
    SentinelControlsComponent
} from '@sentinel/components/controls';
import { Group } from '@crczp/user-and-group-model';
import { async, defer, Observable, of } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import { GROUP_DATA_ATTRIBUTE_NAME, UserAndGroupDefaultNavigator, UserAndGroupNavigator } from '../../../public';
import { SaveControlItem } from '../../../internal/src';
import { GroupChangedEvent } from '../model/group-changed-event';
import { GroupEditService } from '../services/state/group-edit.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GroupEditCanDeactivate } from '../services/can-deactivate/group-edit-can-deactivate.service';
import { MatExpansionPanel, MatExpansionPanelDescription, MatExpansionPanelTitle } from '@angular/material/expansion';
import { GroupEditComponent } from './group-edit/group-edit.component';
import { MatDivider } from '@angular/material/divider';
import { AsyncPipe, NgIf } from '@angular/common';
import { GroupUserAssignComponent } from './group-user-assign/group-user-assign.component';
import { MatIcon } from '@angular/material/icon';
import { MatError } from '@angular/material/input';
import { GroupRoleAssignComponent } from './group-role-assign/group-role-assign.component';

@Component({
    selector: 'crczp-group-edit-overview',
    templateUrl: './group-edit-overview.component.html',
    styleUrls: ['./group-edit-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        GroupEditComponent,
        GroupRoleAssignComponent,
        GroupUserAssignComponent,
        MatDivider,
        MatError,
        MatExpansionPanel,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatIcon,
        NgIf,
        SentinelControlsComponent,
    ],
    providers: [
        GroupEditCanDeactivate,
        { provide: GroupEditService, useClass: GroupEditService },
        { provide: UserAndGroupNavigator, useClass: UserAndGroupDefaultNavigator },
    ]
})
export class GroupEditOverviewComponent {
    constructor(
        private activeRoute: ActivatedRoute,
        private editService: GroupEditService
    ) {
        this.group$ = this.editService.group$;
        this.editMode$ = this.editService.editMode$.pipe(tap((editMode) => this.initControls(editMode)));
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.editService.set(data[GROUP_DATA_ATTRIBUTE_NAME]));
    }

    @Output() canDeactivateEvent: EventEmitter<boolean> = new EventEmitter();
    group$: Observable<Group>;
    editMode$: Observable<boolean>;
    canDeactivateGroupEdit = true;
    canDeactivateMembers = true;
    canDeactivateRoles = true;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    protected readonly of = of;
    protected readonly async = async;

    /**
     * Determines if all changes in subcomponents are saved and user can navigate to different component
     */
    canDeactivate(): boolean {
        return this.canDeactivateGroupEdit && this.canDeactivateMembers && this.canDeactivateRoles;
    }

    onControlAction(controlItem: SentinelControlItemSignal): void {
        controlItem.result$.pipe(take(1)).subscribe();
    }

    onGroupChanged(groupEvent: GroupChangedEvent): void {
        this.canDeactivateGroupEdit = false;
        this.editService.change(groupEvent);
    }

    onUnsavedMembersChange(hasUnsavedChanges: boolean): void {
        this.canDeactivateMembers = !hasUnsavedChanges;
    }

    onUnsavedRolesChange(hasUnsavedChanges: boolean): void {
        this.canDeactivateRoles = !hasUnsavedChanges;
    }

    private initControls(isEditMode: boolean) {
        const saveItem = new SaveControlItem(
            'Save',
            this.editService.saveDisabled$,
            defer(() => this.editService.save().pipe(tap(() => (this.canDeactivateGroupEdit = true))))
        );
        if (isEditMode) {
            this.controls = [saveItem];
        } else {
            saveItem.label = 'Create';
            const saveAndStayItem = new SaveControlItem(
                'Create and continue editing',
                this.editService.saveDisabled$,
                defer(() => this.editService.createAndEdit().pipe(tap(() => (this.canDeactivateGroupEdit = true))))
            );
            saveAndStayItem.id = 'save_and_stay';
            this.controls = [saveItem, saveAndStayItem];
        }
    }
}
