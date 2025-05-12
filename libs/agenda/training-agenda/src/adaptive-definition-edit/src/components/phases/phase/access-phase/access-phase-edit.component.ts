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
import { AccessPhaseEditFormGroup } from './access-phase-edit-form-group';
import { AbstractControl } from '@angular/forms';
import { AccessPhase } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for editing of new or existing info-phase-training-phase phases
 */
@Component({
    selector: 'crczp-access-phase-configuration',
    templateUrl: './access-phase-edit.component.html',
    styleUrls: ['./access-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessPhaseEditComponent implements OnChanges {
    @Input() phase: AccessPhase;
    @Output() phaseChange: EventEmitter<AccessPhase> = new EventEmitter();

    phaseConfigFormGroup: AccessPhaseEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('title');
    }

    get passkey(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('passkey');
    }

    get cloudContent(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('cloudContent');
    }

    get localContent(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('localContent');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.phaseConfigFormGroup = new AccessPhaseEditFormGroup(this.phase);
            this.phaseConfigFormGroup.formGroup.get('title').markAsTouched();
            this.phaseConfigFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.phaseConfigFormGroup.setToPhase(this.phase);
                this.phaseChange.emit(this.phase);
            });
        }
    }
}
