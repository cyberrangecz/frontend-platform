import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { SentinelControlItem } from '@sentinel/components/controls';
import { defer } from 'rxjs';
import { SandboxDefinitionEditService } from '../services/sandbox-definition-edit.service';
import { SandboxDefinitionFormGroup } from './sandbox-definition-edit-form-group';
import { AbstractControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';

/**
 * Component with form for creating new sandbox definition
 */
@Component({
    selector: 'crczp-create-sandbox-definition',
    templateUrl: './sandbox-definition-edit.component.html',
    styleUrls: ['./sandbox-definition-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SandboxDefinitionEditComponent implements OnInit {
    sandboxDefinitionFormGroup: SandboxDefinitionFormGroup;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    constructor(private sandboxDefinitionService: SandboxDefinitionEditService) {}

    ngOnInit(): void {
        this.sandboxDefinitionFormGroup = new SandboxDefinitionFormGroup();
        this.initControls();
        this.sandboxDefinitionFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.initControls());
    }

    get gitUrl(): AbstractControl {
        return this.sandboxDefinitionFormGroup.formGroup.get('gitUrl');
    }

    get revision(): AbstractControl {
        return this.sandboxDefinitionFormGroup.formGroup.get('revision');
    }

    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    keyDownAction(event: KeyboardEvent): void {
        if (this.sandboxDefinitionFormGroup.formGroup.valid && event.key === 'Enter') {
            this.controls[0].result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
        }
    }

    private initControls() {
        this.controls = [
            new SentinelControlItem(
                'create',
                'Create',
                'primary',
                this.sandboxDefinitionService.isLoading$.pipe(
                    map((loading) => loading || !this.sandboxDefinitionFormGroup.formGroup.valid),
                ),
                defer(() => this.sandboxDefinitionService.create(this.sandboxDefinitionFormGroup.createFromValues())),
            ),
        ];
    }
}
