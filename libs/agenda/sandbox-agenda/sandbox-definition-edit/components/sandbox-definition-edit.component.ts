import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SentinelControlItem, SentinelControlsComponent } from '@sentinel/components/controls';
import { defer } from 'rxjs';
import { SandboxDefinitionEditService } from '../services/sandbox-definition-edit.service';
import { SandboxDefinitionFormGroup } from './sandbox-definition-edit-form-group';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map, take } from 'rxjs/operators';
import { SandboxDefinitionEditConcreteService } from '../services/sandbox-definition-edit-concrete.service';
import { MatCard } from '@angular/material/card';
import { MatError, MatFormField, MatInput, MatLabel, MatSuffix } from '@angular/material/input';
import { ClearInputSuffixComponent } from '@crczp/utils';

/**
 * Component with form for creating new sandbox definition
 */
@Component({
    selector: 'crczp-create-sandbox-definition',
    templateUrl: './sandbox-definition-edit.component.html',
    styleUrls: ['./sandbox-definition-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ClearInputSuffixComponent,
        SentinelControlsComponent,
        MatCard,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatError,
        MatInput,
        MatSuffix,
    ],
    providers: [
        {
            provide: SandboxDefinitionEditService,
            useClass: SandboxDefinitionEditConcreteService,
        },
    ],
})
export class SandboxDefinitionEditComponent implements OnInit {
    sandboxDefinitionFormGroup: SandboxDefinitionFormGroup;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);
    private sandboxDefinitionService = inject(SandboxDefinitionEditService);
    private readonly isCreating = toSignal(
        this.sandboxDefinitionService.isLoading$,
        { initialValue: false },
    );

    get gitUrl(): AbstractControl {
        return this.sandboxDefinitionFormGroup.formGroup.get('gitUrl');
    }

    get revision(): AbstractControl {
        return this.sandboxDefinitionFormGroup.formGroup.get('revision');
    }

    ngOnInit(): void {
        this.sandboxDefinitionFormGroup = new SandboxDefinitionFormGroup();
        this.initControls();
        this.sandboxDefinitionFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls());
    }

    keyDownAction(event: KeyboardEvent): void {
        if (event.key !== 'Enter') {
            return;
        }
        if (
            this.isCreating() ||
            !this.sandboxDefinitionFormGroup.formGroup.valid
        ) {
            return;
        }
        this.controls[0]?.result$
            ?.pipe(take(1), takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private initControls() {
        this.controls = [
            new SentinelControlItem(
                'create',
                'Create',
                'primary',
                this.sandboxDefinitionService.isLoading$.pipe(
                    map(
                        (loading) =>
                            loading ||
                            !this.sandboxDefinitionFormGroup.formGroup.valid,
                    ),
                ),
                defer(() =>
                    this.sandboxDefinitionService.create(
                        this.sandboxDefinitionFormGroup.createFromValues(),
                    ),
                ),
            ),
        ];
    }
}
