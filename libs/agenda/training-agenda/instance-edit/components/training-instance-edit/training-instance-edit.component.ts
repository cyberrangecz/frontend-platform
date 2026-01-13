import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import { TrainingDefinitionInfo, TrainingInstance, TrainingTypeEnum } from '@crczp/training-model';
import { TrainingInstanceChangeEvent } from '../../model/events/training-instance-change-event';
import { TrainingInstanceFormGroup } from './training-instance-form-group';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Pool, SandboxDefinition } from '@crczp/sandbox-model';
import { BehaviorSubject, combineLatestWith, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Routing } from '@crczp/routing-commons';
import {
    SentinelResourceSelectorComponent,
    SentinelSelectorElementDirective,
    SentinelSelectorSelectedElementDirective
} from '@sentinel/components/resource-selector';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatError, MatFormField, MatHint, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { InjectionTokens } from '@crczp/utils';

/**
 * Component for creating new or editing existing training instance
 */
@Component({
    selector: 'crczp-training-instance-edit',
    templateUrl: './training-instance-edit.component.html',
    styleUrls: ['./training-instance-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelResourceSelectorComponent,
        SentinelSelectorSelectedElementDirective,
        AsyncPipe,
        SentinelSelectorElementDirective,
        RouterLink,
        MatButton,
        MatTooltip,
        MatIcon,
        OwlDateTimeModule,
        MatFormField,
        MatFormField,
        MatSlideToggle,
        ReactiveFormsModule,
        MatIconButton,
        MatSuffix,
        MatInput,
        MatFormField,
        MatLabel,
        MatError,
        OwlNativeDateTimeModule,
        MatHint,
    ],
})
export class TrainingInstanceEditComponent implements OnChanges, AfterViewInit {
    @Input() trainingInstance: TrainingInstance;
    @Input() hasStarted: boolean;
    @Input() editMode: boolean;
    @Input() trainingDefinitions: TrainingDefinitionInfo[];
    @Input() pools: Pool[];
    @Input() sandboxDefinitions: SandboxDefinition[];
    @Input() localEnvironmentAllowed: boolean;

    @Output() edited: EventEmitter<TrainingInstanceChangeEvent> =
        new EventEmitter();

    @ViewChild('trainingDefinitionSelect', { static: false, read: ElementRef })
    trainingDefinitionSelect: ElementRef;
    @ViewChild('sandboxDefinitionSelect', { static: false, read: ElementRef })
    sandboxDefinitionSelect: ElementRef;
    @ViewChild('poolSelect', { static: false, read: ElementRef })
    poolSelect: ElementRef;
    now: Date;
    trainingInstanceFormGroup: TrainingInstanceFormGroup;
    protected readonly TrainingTypeEnum = TrainingTypeEnum;
    private trainingDefinitionsSubject = new BehaviorSubject<
        TrainingDefinitionInfo[]
    >([]);
    private poolSubject = new BehaviorSubject<Pool[]>([]);
    private sandboxDefinitionSubject = new BehaviorSubject<SandboxDefinition[]>(
        [],
    );
    private trainingDefinitionSearchStringSubject = new BehaviorSubject<string>(
        '',
    );
    private sandboxDefinitionSearchStringSubject = new BehaviorSubject<string>(
        '',
    );
    private poolSearchStringSubject = new BehaviorSubject<string>('');
    private readonly destroyRef = inject(DestroyRef);
    private readonly trainingType = inject(InjectionTokens.TrainingType);

    get startTime(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('startTime');
    }

    get endTime(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('endTime');
    }

    get title(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('title');
    }

    get trainingDefinition(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get(
            'trainingDefinition',
        );
    }

    get accessTokenPrefix(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get(
            'accessTokenPrefix',
        );
    }

    get localEnvironment(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('localEnvironment');
    }

    get backwardMode(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('backwardMode');
    }

    get showStepperBar(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('showStepperBar');
    }

    get poolId(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get('poolId');
    }

    get sandboxDefinitionId(): AbstractControl {
        return this.trainingInstanceFormGroup.formGroup.get(
            'sandboxDefinitionId',
        );
    }

    get trainingDefinitions$(): Observable<TrainingDefinitionInfo[]> {
        return this.trainingDefinitionsSubject.pipe(
            combineLatestWith(this.trainingDefinitionSearchStringSubject),
            map(([tds, search]) =>
                tds.filter((td) =>
                    td.title.toLowerCase().includes(search.toLowerCase()),
                ),
            ),
        );
    }

    get pools$(): Observable<Pool[]> {
        return this.poolSubject.pipe(
            map((pools) =>
                pools.filter((pool) => pool.lockState === 'unlocked'),
            ),
            combineLatestWith(this.poolSearchStringSubject),
            map(([pools, search]) =>
                pools.filter((pool) =>
                    this.poolToDisplayString(pool)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                ),
            ),
        );
    }

    get sandboxDefinitions$(): Observable<SandboxDefinition[]> {
        return this.sandboxDefinitionSubject.pipe(
            combineLatestWith(this.sandboxDefinitionSearchStringSubject),
            map(([sds, search]) =>
                sds.filter((sd) =>
                    this.sandboxDefinitionToDisplayString(sd)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                ),
            ),
        );
    }

    ngAfterViewInit() {
        this.trainingDefinition.statusChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() =>
                this.changeValidity(
                    this.isTrainingDefinitionError(),
                    this.trainingDefinitionSelect,
                ),
            );
        this.trainingInstanceFormGroup.formGroup.statusChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                if (this.sandboxDefinitionSelect) {
                    this.changeValidity(
                        this.isSandboxDefinitionIdError(),
                        this.sandboxDefinitionSelect,
                    );
                }
                if (this.poolSelect) {
                    this.changeValidity(this.isPoolIdError(), this.poolSelect);
                }
            });
    }

    revalidate() {
        this.trainingDefinition.updateValueAndValidity();
        this.trainingInstanceFormGroup.formGroup.updateValueAndValidity();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingDefinitions' in changes) {
            this.trainingDefinitionsSubject.next(
                changes.trainingDefinitions.currentValue,
            );
        }
        if ('pools' in changes) {
            this.poolSubject.next(changes.pools.currentValue);
        }
        if ('sandboxDefinitions' in changes) {
            this.sandboxDefinitionSubject.next(
                changes.sandboxDefinitions.currentValue,
            );
        }
        if ('trainingInstance' in changes) {
            this.trainingInstanceFormGroup = new TrainingInstanceFormGroup(
                this.trainingInstance,
            );
            this.setupOnFormChangedEvent();
        }
        if ('hasStarted' in changes && this.hasStarted) {
            this.trainingInstanceFormGroup.disable();
        }
        if ('editMode' in changes && changes.editMode.currentValue) {
            this.trainingInstanceFormGroup.disable();
        }
    }

    poolToDisplayString(pool: Pool): string {
        if (!pool) {
            return '';
        }
        return (
            'Pool ' +
            pool.id +
            ' - ' +
            this.sandboxDefinitionToDisplayString(pool.definition)
        );
    }

    sandboxDefinitionToDisplayString(
        sandboxDefinition?: SandboxDefinition,
    ): string {
        if (!sandboxDefinition) {
            return '';
        }
        return sandboxDefinition.title + ' [' + sandboxDefinition.rev + ']';
    }

    onTrainingDefinitionFilter(search: string) {
        this.trainingDefinitionSearchStringSubject.next(search);
    }

    onPoolFilter(search: string) {
        this.poolSearchStringSubject.next(search);
    }

    onSandboxDefinitionFilter(search: string) {
        this.sandboxDefinitionSearchStringSubject.next(search);
    }

    setSelectedPool(pool: Pool) {
        if (!pool) {
            this.poolId.setValue(null);
            return;
        }
        this.poolId.setValue(pool.id);
    }

    setSelectedSandboxDefinition(sandboxDefinition?: SandboxDefinition) {
        if (!sandboxDefinition) {
            this.sandboxDefinitionId.setValue(null);
            return;
        }
        this.sandboxDefinitionId.setValue(sandboxDefinition.id);
    }

    getSelectedSandboxDefinition() {
        return (
            this.sandboxDefinitionSubject.value.find(
                (sd) => sd.id === this.sandboxDefinitionId.value,
            ) || undefined
        );
    }

    getSelectedPool() {
        return (
            this.poolSubject.value.find(
                (pool) => pool.id === this.poolId.value,
            ) || undefined
        );
    }

    getSelectedTrainingDefinition() {
        return this.trainingDefinition.value || undefined;
    }

    isTrainingDefinitionError() {
        return (
            this.trainingDefinition.errors && !this.trainingDefinition.untouched
        );
    }

    isSandboxDefinitionIdError() {
        return (
            this.trainingInstanceFormGroup.formGroup.hasError(
                'sandboxDefinitionRequired',
            ) && !this.sandboxDefinitionId.untouched
        );
    }

    isPoolIdError() {
        return (
            this.trainingInstanceFormGroup.formGroup.hasError('poolRequired') &&
            !this.poolId.untouched
        );
    }

    getPoolUrl(id: string) {
        return Routing.RouteBuilder.pool.poolId(id).build();
    }

    getTrainingDefinitionUrl(id: number) {
        return Routing.RouteBuilder[
            this.trainingType === TrainingTypeEnum.ADAPTIVE
                ? 'adaptive_definition'
                : 'linear_definition'
        ]
            .definitionId(id)
            .detail.build();
    }

    private changeValidity(error: boolean, resourceSelector: ElementRef) {
        if (error) {
            resourceSelector.nativeElement
                .querySelector('.mat-mdc-text-field-wrapper')
                ?.classList.add('mdc-text-field--invalid');
        } else {
            resourceSelector.nativeElement
                .querySelector('.mat-mdc-text-field-wrapper')
                ?.classList.remove('mdc-text-field--invalid');
        }
    }

    private setupOnFormChangedEvent() {
        this.trainingInstanceFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.onChanged());
    }

    private onChanged() {
        this.trainingInstanceFormGroup.setValuesToTrainingInstance(
            this.trainingInstance,
        );

        this.edited.emit(
            new TrainingInstanceChangeEvent(
                this.trainingInstance,
                this.trainingInstanceFormGroup.formGroup.valid,
            ),
        );
    }
}
