import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { AnsibleOutputsService } from '../../../services/state/detail/ansible-outputs.service';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe } from '@angular/common';
import { TerraformOutputsService } from '../../../services/state/detail/terraform-outputs.service';
import { search } from '@codemirror/search';
import { StageAdapter } from '../../../model/adapters/stage-adapter';
import { AnsibleStageAdapter } from '../../../model/adapters/ansible-stage-adapter';
import { RequestStageType } from '@crczp/sandbox-model';
import { CodeViewerWrapper } from '@crczp/components';
import { CodeEditor } from '@acrodata/code-editor';
import { createInfinitePaginationEvent } from '@crczp/api-common';
import { AllocationOutputSort } from '@crczp/sandbox-api';

@Component({
    selector: 'crczp-allocation-stage-detail',
    templateUrl: './allocation-stage-detail.component.html',
    styleUrls: ['./allocation-stage-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, CodeViewerWrapper, CodeEditor],
})
export class AllocationStageDetailComponent implements OnChanges {
    stage = input.required<StageAdapter>();
    height = input<CSSStyleDeclaration['height']>('100%');
    outputs$: Observable<string>;
    hasOutputs$: Observable<boolean>;
    isLoading$: Observable<boolean>;
    hasError$: Observable<boolean>;
    destroyRef = inject(DestroyRef);
    lineWrapping = true;
    protected readonly search = search;

    private readonly ansibleOutputsService = inject(AnsibleOutputsService);
    private readonly terraformOutputsService = inject(TerraformOutputsService);

    private outputsService: AnsibleOutputsService | TerraformOutputsService;

    ngOnChanges(changes: SimpleChanges): void {
        if (
            this.stage &&
            'stage' in changes &&
            changes['stage'].isFirstChange()
        ) {
            this.outputsService = this.resolveAllocationOutputsService();
            this.init();
        }
    }

    init(): void {
        this.onFetchEvents(createInfinitePaginationEvent('content'));

        this.outputs$ = this.outputsService.resource$.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((resource) => resource.elements.map((e) => e).join('\n')),
        );
        this.hasOutputs$ = this.outputs$.pipe(map((text) => text.length > 0));
        this.isLoading$ = this.outputsService.isLoading$.pipe(
            takeUntilDestroyed(this.destroyRef),
        );
        this.hasError$ = this.outputsService.hasError$.pipe(
            takeUntilDestroyed(this.destroyRef),
        );
    }

    onFetchEvents(
        requestedPagination: OffsetPaginationEvent<AllocationOutputSort>,
    ): void {
        this.outputsService
            .getAll(this.stage(), requestedPagination)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    /**
     * Transform to AnsibleStageAdapter if the stage is of type Ansible, otherwise return null
     * @param stage The stage to transform
     * @returns The transformed AnsibleStageAdapter or null
     */
    asAnsibleStage(stage: StageAdapter): AnsibleStageAdapter | null {
        if (this.isAnsibleStage(stage)) {
            return stage as AnsibleStageAdapter;
        }
    }

    /**
     * Check if the stage is of type Ansible
     * @param stage The stage to check
     * @returns True if the stage is of type Ansible, false otherwise
     */
    isAnsibleStage(stage: StageAdapter): boolean {
        return stage.type === RequestStageType.USER_ANSIBLE_ALLOCATION;
    }

    private resolveAllocationOutputsService():
        | AnsibleOutputsService
        | TerraformOutputsService {
        switch (this.stage().type) {
            case RequestStageType.TERRAFORM_ALLOCATION:
            case RequestStageType.TERRAFORM_CLEANUP:
                return this.terraformOutputsService;
            case RequestStageType.USER_ANSIBLE_ALLOCATION:
            case RequestStageType.USER_ANSIBLE_CLEANUP:
            case RequestStageType.NETWORKING_ANSIBLE_ALLOCATION:
            case RequestStageType.NETWORKING_ANSIBLE_CLEANUP:
                return this.ansibleOutputsService;
            default:
                throw new Error(`Unsupported stage type: ${this.stage().type}`);
        }
    }
}
