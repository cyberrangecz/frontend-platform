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
import {AccessLevel} from '@crczp/training-model';
import {AccessLevelEditFormGroup} from './access-level-edit-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {MatIconButton} from "@angular/material/button";

/**
 * Component for editing of new or existing info level
 */
@Component({
    selector: 'crczp-access-level-configuration',
    templateUrl: './access-level-edit.component.html',
    styleUrls: ['./access-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownEditorComponent,
        MatError,
        MatIcon,
        MatTooltip,
        MatFormField,
        ReactiveFormsModule,
        MatLabel,
        MatInput,
        MatIconButton,
        MatHint
    ]
})
export class AccessLevelEditComponent implements OnChanges {
    @Input() level: AccessLevel;
    @Output() levelChange: EventEmitter<AccessLevel> = new EventEmitter();

    accessLevelConfigFormGroup: AccessLevelEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.accessLevelConfigFormGroup.formGroup.get('title');
    }

    get passkey(): AbstractControl {
        return this.accessLevelConfigFormGroup.formGroup.get('passkey');
    }

    get cloudContent(): AbstractControl {
        return this.accessLevelConfigFormGroup.formGroup.get('cloudContent');
    }

    get localContent(): AbstractControl {
        return this.accessLevelConfigFormGroup.formGroup.get('localContent');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.accessLevelConfigFormGroup = new AccessLevelEditFormGroup(this.level);
            this.title.markAsTouched();
            this.accessLevelConfigFormGroup.formGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.accessLevelConfigFormGroup.setToLevel(this.level);
                    this.levelChange.emit(this.level);
                });
        }
    }
}
