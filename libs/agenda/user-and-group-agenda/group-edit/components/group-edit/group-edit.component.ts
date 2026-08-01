import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges
} from '@angular/core';
import { Group } from '@crczp/user-and-group-model';
import { GroupChangedEvent } from '../../model/group-changed-event';
import { GroupEditFormGroup } from './group-edit-form-group';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatError, MatFormField, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { MatTooltip } from '@angular/material/tooltip';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { ClearInputSuffixComponent } from '@crczp/utils';

/**
 * Component for editing basic group-overview attributes
 */
@Component({
    selector: 'crczp-group-edit',
    templateUrl: './group-edit.component.html',
    styleUrls: ['./group-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ClearInputSuffixComponent,
        MatInput,
        MatFormField,
        ReactiveFormsModule,
        MatTooltip,
        MatError,
        MatLabel,
        OwlNativeDateTimeModule,
        OwlDateTimeModule,
        MatSuffix,
    ],
})
export class GroupEditComponent implements OnInit, OnChanges {
    /**
     * Edited group-overview
     */
    @Input() group: Group;

    /**
     * Event emitter for group-overview change action
     */
    @Output() edited: EventEmitter<GroupChangedEvent> = new EventEmitter();

    tomorrow: Date;
    groupEditFormGroup: GroupEditFormGroup;
    destroyRef = inject(DestroyRef);

    get name(): AbstractControl {
        return this.groupEditFormGroup.formGroup.get('name');
    }

    get description(): AbstractControl {
        return this.groupEditFormGroup.formGroup.get('description');
    }

    get expirationDate(): AbstractControl {
        return this.groupEditFormGroup.formGroup.get('expirationDate');
    }

    ngOnInit(): void {
        const today = new Date();
        this.tomorrow = new Date(
            new Date(today.setDate(today.getDate() + 1)).setHours(0, 0, 0),
        );
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('group' in changes) {
            this.groupEditFormGroup = new GroupEditFormGroup(this.group);
            this.setupOnFormChangedEvent();
        }
    }

    private setupOnFormChangedEvent() {
        this.groupEditFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onChanged());
    }

    private onChanged() {
        this.groupEditFormGroup.setValuesToGroup(this.group);
        this.edited.emit(
            new GroupChangedEvent(
                this.group,
                this.groupEditFormGroup.formGroup.valid,
            ),
        );
    }
}
