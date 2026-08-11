import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
    SentinelControlItem,
    SentinelControlsComponent,
} from '@sentinel/components/controls';
import { Group } from '@crczp/user-and-group-model';
import { defer, filter, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { UnsavedChangesTracker } from '@crczp/utils';
import { SaveControlItem } from '@crczp/user-and-group-agenda/internal';
import { GroupChangedEvent } from '../model/group-changed-event';
import { GroupEditService } from '../services/state/group-edit.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
} from '@angular/material/expansion';
import { GroupEditComponent } from './group-edit/group-edit.component';
import { MatDivider } from '@angular/material/divider';
import { AsyncPipe } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatError } from '@angular/material/input';
import { GroupRoleAssignComponent } from './group-role-assign/group-role-assign.component';
import { GroupUserAssignComponent } from './group-user-assign/group-user-assign.component';

@Component({
    selector: 'crczp-group-edit-overview',
    templateUrl: './group-edit-overview.component.html',
    styleUrls: ['./group-edit-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AsyncPipe,
        GroupEditComponent,
        MatDivider,
        MatError,
        MatExpansionPanel,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatIcon,
        SentinelControlsComponent,
        MatExpansionPanelHeader,
        GroupRoleAssignComponent,
        GroupUserAssignComponent,
    ],
    providers: [{ provide: GroupEditService, useClass: GroupEditService }],
})
export class GroupEditOverviewComponent {
    group$: Observable<Group> = of();
    editMode$: Observable<boolean>;
    protected readonly unsavedChanges = new UnsavedChangesTracker<
        'groupDetails' | 'groupMembers' | 'groupRoles'
    >();
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    protected readonly of = of;
    private activeRoute = inject(ActivatedRoute);
    private editService = inject(GroupEditService);

    constructor() {
        this.group$ = this.editService.group$.pipe(
            filter((group) => !!group),
            takeUntilDestroyed(this.destroyRef),
        );
        this.editMode$ = this.editService.editMode$.pipe(
            takeUntilDestroyed(this.destroyRef),
            tap((editMode) => this.initControls(editMode)),
        );
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((data) => this.editService.set(data[Group.name]));
    }

    /**
     * Determines if all changes in subcomponents are saved and user can navigate to different component
     */
    canDeactivate(): boolean {
        return !this.unsavedChanges.hasAny();
    }

    onGroupChanged(groupEvent: GroupChangedEvent): void {
        this.unsavedChanges.set('groupDetails', true);
        this.editService.change(groupEvent);
    }

    onUnsavedMembersChange(hasUnsavedChanges: boolean): void {
        this.unsavedChanges.set('groupMembers', hasUnsavedChanges);
    }

    onUnsavedRolesChange(hasUnsavedChanges: boolean): void {
        this.unsavedChanges.set('groupRoles', hasUnsavedChanges);
    }

    private initControls(isEditMode: boolean) {
        const saveItem = new SaveControlItem(
            'Save',
            this.editService.saveDisabled$,
            defer(() =>
                this.editService
                    .save()
                    .pipe(this.unsavedChanges.clearOnSuccess('groupDetails')),
            ),
        );
        if (isEditMode) {
            this.controls = [saveItem];
        } else {
            saveItem.label = 'Create';
            const saveAndStayItem = new SaveControlItem(
                'Create and continue editing',
                this.editService.saveDisabled$,
                defer(() =>
                    this.editService
                        .createAndEdit()
                        .pipe(this.unsavedChanges.clearOnSuccess('groupDetails')),
                ),
            );
            saveAndStayItem.id = 'save_and_stay';
            this.controls = [saveItem, saveAndStayItem];
        }
    }
}
