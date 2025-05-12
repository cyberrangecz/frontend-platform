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
import { AbstractControl, Validators } from '@angular/forms';
import { Hint } from '@crczp/training-model';
import { HintEditFormGroup } from './hint-edit-form-group';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-hint-edit',
    templateUrl: './hint-detail-edit.component.html',
    styleUrls: ['./hint-detail-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component to edit new or existing training level hint
 */
export class HintDetailEditComponent implements OnChanges {
    @Input() hint: Hint;
    @Input() levelMaxScore: number;
    @Input() hintsPenaltySum: number;
    @Input() order: number;
    @Output() hintChange: EventEmitter<Hint> = new EventEmitter();

    maxHintPenalty: number;
    hintConfigurationFormGroup: HintEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.hintConfigurationFormGroup.formGroup.get('title');
    }

    get content(): AbstractControl {
        return this.hintConfigurationFormGroup.formGroup.get('content');
    }

    get hintPenalty(): AbstractControl {
        return this.hintConfigurationFormGroup.formGroup.get('hintPenalty');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('hint' in changes) {
            this.hintConfigurationFormGroup = new HintEditFormGroup(this.hint);
            this.title.markAsTouched();
            this.hintPenalty.markAsTouched();
            this.calculateMaxPenalty();
            this.subscribeFormChanges();
        }
        if ('hintsPenaltySum' in changes || 'levelMaxScore' in changes) {
            this.calculateMaxPenalty();
        }
    }

    /**
     * Changes internal component state and emits event on hint change
     */
    onHintChanged(): void {
        this.hintConfigurationFormGroup.formGroup.markAsDirty();
        this.hintConfigurationFormGroup.setToHint(this.hint);
        this.hintChange.emit(this.hint);
    }

    private subscribeFormChanges() {
        this.hintConfigurationFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onHintChanged());
    }

    private calculateMaxPenalty() {
        this.maxHintPenalty = this.levelMaxScore - (this.hintsPenaltySum - this.hint.penalty);
        this.hintPenalty.setValidators([Validators.required, Validators.min(0), Validators.max(this.maxHintPenalty)]);
    }
}
