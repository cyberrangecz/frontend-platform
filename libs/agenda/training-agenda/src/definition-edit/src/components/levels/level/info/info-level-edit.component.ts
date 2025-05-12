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
import { InfoLevel } from '@crczp/training-model';
import { InfoLevelEditFormGroup } from './info-level-edit-form-group';
import { AbstractControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for editing of new or existing info level
 */
@Component({
    selector: 'crczp-info-level-configuration',
    templateUrl: './info-level-edit.component.html',
    styleUrls: ['./info-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InfoLevelEditComponent implements OnChanges {
    @Input() level: InfoLevel;
    @Output() levelChange: EventEmitter<InfoLevel> = new EventEmitter();

    infoLevelConfigFormGroup: InfoLevelEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.infoLevelConfigFormGroup.formGroup.get('title');
    }

    get content(): AbstractControl {
        return this.infoLevelConfigFormGroup.formGroup.get('content');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.infoLevelConfigFormGroup = new InfoLevelEditFormGroup(this.level);
            this.title.markAsTouched();
            this.infoLevelConfigFormGroup.formGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.infoLevelConfigFormGroup.setToLevel(this.level);
                    this.levelChange.emit(this.level);
                });
        }
    }
}
