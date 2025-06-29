import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MicroserviceRole } from '@crczp/user-and-group-model';
import { MicroserviceRoleItem } from '../../../model/microservice-role-item';
import { MicroserviceRoleForm } from './microservice-role-form';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard, MatCardContent, MatCardHeader } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormField, MatInput } from '@angular/material/input';

/**
 * Component of individual microservice-registration role
 */
@Component({
    selector: 'crczp-microservice-role',
    templateUrl: './microservice-role.component.html',
    styleUrls: ['./microservice-role.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatIcon,
        MatIconButton,
        MatTooltip,
        MatCardContent,
        MatCheckbox,
        ReactiveFormsModule,
        MatFormField,
        MatInput
    ]
})
export class MicroserviceRoleComponent implements OnChanges {
    /**
     * Edited role
     */
    @Input() role: MicroserviceRole;

    /**
     * Emits event to delete this role
     */
    @Output() delete = new EventEmitter();

    /**
     * Emits event on role change
     */
    @Output() roleChange: EventEmitter<MicroserviceRoleItem> = new EventEmitter();

    /**
     * Form control of state group-overview
     */
    microserviceRoleFormGroup: MicroserviceRoleForm;

    destroyRef = inject(DestroyRef);

    get description(): AbstractControl {
        return this.microserviceRoleFormGroup.formGroup.get('description');
    }

    get type(): AbstractControl {
        return this.microserviceRoleFormGroup.formGroup.get('type');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('role' in changes) {
            this.microserviceRoleFormGroup = new MicroserviceRoleForm(this.role);
            this.setupOnFormChangedEvent();
        }
    }

    /**
     * Emits event to delete this role
     */
    deleteRole(): void {
        this.delete.emit();
    }

    /**
     * Clears values of the form
     */
    onClear(): void {
        this.microserviceRoleFormGroup.setValuesToRole(this.role);
        this.roleChange.emit({
            role: this.role,
            valid: false,
        });
    }

    private setupOnFormChangedEvent() {
        this.microserviceRoleFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onChanged());
    }

    private onChanged() {
        this.microserviceRoleFormGroup.setValuesToRole(this.role);
        this.roleChange.emit({
            role: this.role,
            valid: this.microserviceRoleFormGroup.formGroup.valid,
        });
    }
}
