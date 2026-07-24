import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NotificationService } from '@crczp/utils';
import { ChartSourceStatus } from '../data-source/chart-source.types';
import { CsvExportable } from '../csv/csv-exportable';
import { exportCsv } from '../csv/csv-export.util';
import { PanelPlaceholderComponent } from './panel-placeholder.component';

type PanelRenderMode = 'skeleton' | 'empty' | 'error' | 'content';

/**
 * Card chrome shared by every dashboard panel: title, an optional info tooltip, an
 * optional CSV button, and the loading/empty/error/content state switch driven by
 * {@link ChartSourceStatus}. Panels project their controls into [panelControls] and
 * their chart/table into the default slot. Built on Material mat-card per repo convention.
 */
@Component({
    selector: 'crczp-chart-panel-shell',
    imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, PanelPlaceholderComponent],
    templateUrl: './chart-panel-shell.component.html',
    styleUrl: './chart-panel-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.chart-panel-shell--fit]': "heightMode() === 'fit-content'",
        '[style.--chart-panel-fixed-height]': 'fixedHeight()',
    },
})
export class ChartPanelShellComponent {
    private readonly notificationService = inject(NotificationService);

    /** Panel title shown in the header bar; when omitted the header bar is not rendered. */
    readonly heading = input<string>();
    readonly status = input.required<ChartSourceStatus>();
    readonly info = input<string>();
    readonly exportable = input<CsvExportable<unknown> | null>(null);
    /**
     * Controls the host height strategy.
     * - `'fixed'` (default): the shell occupies a fixed height set by `--chart-panel-fixed-height`
     *   (default `30rem`), aligning all cards in a flex row regardless of content length.
     * - `'fit-content'`: the shell shrinks to its content height, suitable for KPI-style panels
     *   such as Progress that have variable content and must not occupy unused vertical space.
     */
    readonly heightMode = input<'fixed' | 'fit-content'>('fixed');
    /**
     * Fixed height applied to the shell in `'fixed'` height mode, given as any CSS length
     * (e.g. `'37rem'`). When omitted the shell falls back to the `--chart-panel-fixed-height`
     * CSS variable and its `30rem` default. Has no effect in `'fit-content'` mode.
     */
    readonly fixedHeight = input<string>();
    /** Overrides the default empty-state message shown when the query returns no data. */
    readonly emptyMessage = input<string>();

    protected readonly renderMode = computed<PanelRenderMode>(() => {
        const status = this.status();
        if (status === 'idle' || status === 'loading') return 'skeleton';
        if (status === 'empty') return 'empty';
        if (status === 'error') return 'error';
        return 'content';
    });

    /**
     * Tooltip text for the CSV download button. When an exportable is bound, lists
     * the exported column headers so users know exactly what the file contains.
     */
    protected readonly downloadTooltip = computed(() => {
        const exportable = this.exportable();
        if (!exportable) return 'Download CSV';
        const headers = exportable.csvColumns().map((column) => column.header).join(', ');
        return `Download CSV — columns: ${headers}`;
    });

    /**
     * Triggers a CSV export and notifies the user on failure so a rejected promise
     * from entity resolution never surfaces as an unhandled rejection.
     */
    protected async download(): Promise<void> {
        const exportable = this.exportable();
        if (!exportable) return;
        try {
            await exportCsv(exportable);
        } catch {
            this.notificationService.emit('error', 'Could not export CSV.');
        }
    }
}
