import {ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, viewChild} from '@angular/core';
import {FormControl, ReactiveFormsModule} from '@angular/forms';
import {MicroserviceRoleFormGroup} from '../../microservice-edit/microservice-edit-form-group';
import {MatCard, MatCardAvatar, MatCardContent, MatCardHeader, MatCardSubtitle, MatCardTitle} from '@angular/material/card';
import {MatIcon} from '@angular/material/icon';
import {MatIconButton} from '@angular/material/button';
import {ClearInputSuffixComponent} from '@crczp/utils';
import {MatTooltip} from '@angular/material/tooltip';
import {MatError, MatFormField, MatHint, MatInput, MatLabel, MatSuffix} from '@angular/material/input';
import {CdkTextareaAutosize} from '@angular/cdk/text-field';

/**
 * Maximum length of a role description accepted by the backend
 */
const DESCRIPTION_MAX_LENGTH = 255;

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
        MatCardAvatar,
        MatIcon,
        MatIconButton,
        MatTooltip,
        MatCardContent,
        ReactiveFormsModule,
        MatFormField,
        MatInput,
        MatLabel,
        MatError,
        MatHint,
        MatCardTitle,
        MatCardSubtitle,
        MatSuffix,
        CdkTextareaAutosize,
        ClearInputSuffixComponent
    ]
})
export class MicroserviceRoleComponent {
    /**
     * Form of the edited role
     */
    @Input({required: true}) roleFormGroup: MicroserviceRoleFormGroup;

    /**
     * True if this role is the one registered as the microservice default role
     */
    @Input() isDefaultRole = false;

    /**
     * Emits event to delete this role
     */
    @Output() delete = new EventEmitter<void>();

    protected readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

    private readonly typeInput = viewChild.required<ElementRef<HTMLInputElement>>('typeInput');

    get description(): FormControl<string> {
        return this.roleFormGroup.controls.description;
    }

    get type(): FormControl<string> {
        return this.roleFormGroup.controls.type;
    }

    /**
     * Moves focus to the role type field
     */
    focusType(): void {
        this.typeInput().nativeElement.focus();
    }
}
