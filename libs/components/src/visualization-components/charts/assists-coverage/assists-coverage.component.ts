import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    PALETTE,
    RichTooltipDirective,
    RichTooltipModel,
    RichTooltipRow,
} from '../shared';
import { EntityResolverService } from '@crczp/event-query-engine';
import { OverflowTooltipDirective } from '@crczp/utils';
import { AssistCoverageCell, AssistsCoverageVm, createAssistsCoverageSource } from './assists-coverage-source';

/** Fill hue of an assist bar the run under feedback did not open. */
const UNUSED_FILL_COLOR = '#3E8ABD';

/**
 * Per-level breakdown of the hints and solution each training level offers. One section per training
 * level; the level name and its order sit above an outlined card that lists the level's hints in
 * authored order and then its solution as horizontal bars. The assist name sits in a left gutter and
 * the coverage % at the bar end — never on the fill — while the bar length is the share of the level's
 * completers who opened that assist. The assists the run under feedback opened fill with a green shade
 * and carry a matching green check; the rest fill with a neutral accent, so this trainee's help stands out.
 */
@Component({
    selector: 'crczp-assists-coverage',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ChartPanelShellComponent, RichTooltipDirective, MatCardModule, MatIconModule, OverflowTooltipDirective],
    templateUrl: './assists-coverage.component.html',
    styleUrl: './assists-coverage.component.scss',
    host: {
        '[style.--assists-unused]': 'unusedFillColor',
        '[style.--assists-used]': 'usedFillColor',
    },
})
export class AssistsCoverageComponent implements ChartPanelInputs {
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number> = input.required<number>();

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createAssistsCoverageSource(this.instanceId, this.runId, this.entityResolver);

    /** Fill hue for assists this run did not open. */
    protected readonly unusedFillColor = UNUSED_FILL_COLOR;
    /** Fill and check-icon colour for assists this run opened. */
    protected readonly usedFillColor = PALETTE.emerald.color;

    /** The per-level coverage sections, empty until the first fetch resolves. */
    protected readonly levels: Signal<AssistsCoverageVm> = computed(() => this.source.vm() ?? []);

    /** Panel state reflecting the source, reporting empty when no training levels carry assists. */
    protected readonly status: Signal<ChartSourceStatus> = computed(() => {
        const sourceStatus = this.source.status();
        if (sourceStatus === 'error') return 'error';
        if (sourceStatus === 'idle' || sourceStatus === 'loading') return 'loading';
        return this.levels().length === 0 ? 'empty' : 'ready';
    });

    /**
     * Composes the rich hover tooltip for one assist bar: the assist name as the header, its cohort
     * usage, and its penalty when it carries one.
     *
     * @param cell The assist whose name, usage, and penalty populate the tooltip.
     * @returns A tooltip model titled with the assist name.
     */
    protected tooltip(cell: AssistCoverageCell): RichTooltipModel {
        const rows: RichTooltipRow[] = [{ label: 'Used by', value: `${cell.usedCount} of ${cell.completerCount}` }];
        if (cell.penalty !== null) rows.push({ label: 'Penalty', value: `${cell.penalty}` });
        return { title: cell.label, rows };
    }
}
