import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    inject,
    input,
    model,
    signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SentinelResourceSelectorComponent } from '@sentinel/components/resource-selector';
import { TrainingRunSource } from './training-run-source';

interface RunResource {
    id: number;
    traineeName: string;
    stateLabel: string;
}

const RUN_RESOURCE_MAPPING = { id: 'id', title: 'traineeName', subtitle: 'stateLabel' } as const;

@Component({
    selector: 'crczp-run-selector',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SentinelResourceSelectorComponent],
    templateUrl: './run-selector.component.html',
    styleUrl: './run-selector.component.scss',
})
export class RunSelectorComponent {
    readonly instanceId = input.required<number>();
    readonly selectedRunId = model<number | null>(null);

    private readonly trainingRunSource = inject(TrainingRunSource);

    protected readonly resourceMapping = RUN_RESOURCE_MAPPING;

    protected readonly searchText = signal('');

    private readonly runs = toSignal(
        this.trainingRunSource.runs(this.instanceId),
        { initialValue: [] },
    );

    private readonly allResources = computed(() =>
        this.runs().map((run): RunResource => ({
            id: run.id,
            traineeName: run.participantRef.name,
            stateLabel: run.state,
        })),
    );

    protected readonly resources = computed(() => {
        const query = this.searchText().toLowerCase();
        if (!query) return this.allResources();
        return this.allResources().filter(
            (r) =>
                r.traineeName.toLowerCase().includes(query) ||
                r.stateLabel.toLowerCase().includes(query),
        );
    });

    protected readonly singleSelected = computed(() => {
        const id = this.selectedRunId();
        return this.allResources().find((r) => r.id === id);
    });

    constructor() {
        effect(() => {
            const first = this.allResources()[0];
            if (this.selectedRunId() === null && first !== undefined) {
                this.selectedRunId.set(first.id);
            }
        });
    }

    protected onFetch(searchValue: string): void {
        this.searchText.set(searchValue);
    }

    protected onSingleSelectionChange(resource: RunResource): void {
        this.selectedRunId.set(resource.id);
    }
}
