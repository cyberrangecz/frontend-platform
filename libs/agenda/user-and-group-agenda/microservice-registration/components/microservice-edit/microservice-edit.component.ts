import {ChangeDetectionStrategy, Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {FormArray, FormControl, ReactiveFormsModule} from '@angular/forms';
import {Microservice} from '@crczp/user-and-group-model';
import {ClearInputSuffixComponent, OverflowTooltipDirective} from '@crczp/utils';
import {MicroserviceEditFormGroup, MicroserviceRoleFormGroup} from './microservice-edit-form-group';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatCard, MatCardAvatar, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MicroserviceRoleListComponent} from '../microservice-role-list/microservice-role-list.component';

/**
 * Component for editing main info about microservice-registration and its roles
 */
@Component({
    selector: 'crczp-microservice-edit',
    templateUrl: './microservice-edit.component.html',
    styleUrls: ['./microservice-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatCardAvatar,
        MatIcon,
        MatFormField,
        MatInput,
        MatCardContent,
        MicroserviceRoleListComponent,
        OverflowTooltipDirective,
        ClearInputSuffixComponent,
        ReactiveFormsModule,
        MatLabel,
        MatCardTitle,
        MatCardSubtitle,
        MatError,
        MatSuffix
    ]
})
export class MicroserviceEditComponent implements OnInit {
    /**
     * Microservice whose values seed the form
     */
    @Input({required: true}) microservice: Microservice;

    /**
     * Event emitter of microservice-registration change
     */
    @Output() microserviceChange: EventEmitter<Microservice> = new EventEmitter<Microservice>();

    microserviceFormGroup: MicroserviceEditFormGroup;
    destroyRef = inject(DestroyRef);

    get name(): FormControl<string> {
        return this.microserviceFormGroup.formGroup.controls.name;
    }

    get endpoint(): FormControl<string> {
        return this.microserviceFormGroup.formGroup.controls.endpoint;
    }

    get roles(): FormArray<MicroserviceRoleFormGroup> {
        return this.microserviceFormGroup.roles;
    }

    ngOnInit(): void {
        this.microserviceFormGroup = new MicroserviceEditFormGroup(this.microservice);
        this.microserviceFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.microserviceChange.emit(this.microserviceFormGroup.toMicroservice()));
    }

    /**
     * Appends a blank role to the form
     */
    onAddRole(): void {
        this.microserviceFormGroup.addRole();
    }

    /**
     * Removes the role on the given index
     * @param index index of a role to be removed
     */
    onRemoveRole(index: number): void {
        this.microserviceFormGroup.removeRole(index);
    }
}
