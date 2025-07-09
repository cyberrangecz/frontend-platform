import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {defer} from 'rxjs';
import {SandboxDefinitionEditService} from '../services/sandbox-definition-edit.service';
import {SandboxDefinitionFormGroup} from './sandbox-definition-edit-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {map} from 'rxjs/operators';
import {SandboxDefaultNavigator, SandboxNavigator} from "@crczp/sandbox-agenda";
import {SandboxDefinitionEditConcreteService} from "../services/sandbox-definition-edit-concrete.service";
import {MatCard} from "@angular/material/card";
import {MatError, MatFormField, MatInput, MatLabel} from "@angular/material/input";
import {MatIconButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";


/**
 * Component with form for creating new sandbox definition
 */
@Component({
    selector: 'crczp-create-sandbox-definition',
    templateUrl: './sandbox-definition-edit.component.html',
    styleUrls: ['./sandbox-definition-edit.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    SentinelControlsComponent,
    MatCard,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatError,
    MatInput,
    MatIcon,
    MatIconButton
],
    providers: [
        {provide: SandboxNavigator, useClass: SandboxDefaultNavigator},
        {provide: SandboxDefinitionEditService, useClass: SandboxDefinitionEditConcreteService},
    ]
})
export class SandboxDefinitionEditComponent implements OnInit {
    private sandboxDefinitionService = inject(SandboxDefinitionEditService);

    sandboxDefinitionFormGroup: SandboxDefinitionFormGroup;
    controls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

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

    onControlsAction(control: SentinelControlItemSignal): void {
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
