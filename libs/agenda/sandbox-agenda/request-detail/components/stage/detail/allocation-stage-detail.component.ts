import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
} from '@angular/core';
import { merge } from 'rxjs';
import {
    distinctUntilChanged,
    ignoreElements,
    switchMap,
} from 'rxjs/operators';
import { StageAdapter } from '../../../model/adapters/stage-adapter';
import { LogView, SyntaxHighlighting } from '@crczp/components';
import { AllocationRequestDetailComponent } from '../../allocation-request-detail.component';
import { OUTPUTS_NOT_FETCHED } from '../../../services/state/detail/outputs.service';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-allocation-stage-detail',
    templateUrl: './allocation-stage-detail.component.html',
    styleUrl: './allocation-stage-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [LogView],
})
export class AllocationStageDetailComponent {
    readonly stage = input.required<StageAdapter>();
    readonly height = input<CSSStyleDeclaration['height']>('100%');

    private readonly outputServices = inject(
        AllocationRequestDetailComponent.STAGE_LOG_SERVICES_TOKEN,
    );

    protected readonly outputsState = toSignal(this.observeOutputs(), {
        initialValue: OUTPUTS_NOT_FETCHED,
    });

    protected readonly syntaxHighlighting = computed<SyntaxHighlighting>(() =>
        this.stage().isAnsibleStage() ? 'ansible' : 'terraform',
    );

    /** File name of the downloaded log: the stage title in kebab case, then the request id. */
    protected readonly logFileName = computed(() => {
        const { title, requestId } = this.stage();
        const stageName = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return `${stageName}-request-${requestId}.log`;
    });

    protected isStageSettled(): boolean {
        const stage = this.stage();
        return stage.hasFinished() || stage.hasFailed();
    }

    private observeOutputs() {
        const stage$ = toObservable(this.stage);
        return stage$.pipe(
            distinctUntilChanged(
                (previous, current) =>
                    previous.type === current.type &&
                    previous.requestId === current.requestId,
            ),
            switchMap(({ type, requestId }) => {
                const service = this.outputServices[type];
                return merge(
                    service.log$,
                    service
                        .pollUntilComplete(stage$, requestId)
                        .pipe(ignoreElements()),
                );
            }),
        );
    }
}
