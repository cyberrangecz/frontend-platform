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
import { InfoPhaseEditFormGroup } from './info-phase-edit-form-group';
import { AbstractControl } from '@angular/forms';
import { InfoPhase } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for editing of new or existing info-phase-training-phase phases
 */
@Component({
    selector: 'crczp-info-phase-configuration',
    templateUrl: './info-phase-edit.component.html',
    styleUrls: ['./info-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoPhaseEditComponent implements OnChanges {
    @Input() phase: InfoPhase;
    @Output() phaseChange: EventEmitter<InfoPhase> = new EventEmitter();

    phaseConfigFormGroup: InfoPhaseEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('title');
    }

    get content(): AbstractControl {
        return this.phaseConfigFormGroup.formGroup.get('content');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes) {
            this.phaseConfigFormGroup = new InfoPhaseEditFormGroup(this.phase);
            this.phaseConfigFormGroup.formGroup.get('title').markAsTouched();
            this.phaseConfigFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.phaseConfigFormGroup.setToPhase(this.phase);
                this.phaseChange.emit(this.phase);
            });
        }
    }
}
