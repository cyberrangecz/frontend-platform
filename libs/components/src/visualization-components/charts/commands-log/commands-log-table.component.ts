import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    signal,
    Signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { format, formatISO } from 'date-fns';
import { lastValueFrom } from 'rxjs';

import { EntityResolverService, EntityType } from '@crczp/event-query-engine';
import { SortDir } from '@crczp/utils';

import {
    ChartPanelInputs,
    ChartPanelShellComponent,
    ChartSourceStatus,
    commandColor,
    CsvColumn,
    CsvExportable,
    isRunSelected,
    resolveInstanceLevels,
    RichTooltipDirective,
    RichTooltipModel,
    RichTooltipRow,
} from '../shared';
import { CommandLogEntry, createCommandsLogSource } from './commands-log-source';

/** Columns rendered in the commands-log table, in display order. */
const DISPLAYED_COLUMNS: readonly string[] = ['time', 'command', 'level', 'host', 'ip', 'wd'];

/** Placeholder shown in any cell whose value is absent. */
const EMPTY_CELL = '—';

/** One table row: a command entry with its display strings and hover tooltip precomputed. */
interface CommandLogDisplayRow {
    readonly id: string;
    readonly offsetSeconds: number;
    readonly offsetText: string;
    readonly commandLine: string;
    readonly tool: string;
    readonly argumentsSuffix: string;
    readonly toolColor: string;
    readonly levelOrder: number | null;
    readonly levelText: string;
    readonly hostText: string;
    readonly ipText: string;
    readonly workingDirectoryText: string;
    readonly tooltip: RichTooltipModel;
}

/** One CSV row: full forensic detail for a single command. */
interface CommandLogCsvRow {
    readonly traineeName: string;
    readonly login: string;
    readonly email: string;
    readonly offset: string;
    readonly timestamp: string;
    readonly command: string;
    readonly arguments: string;
    readonly level: string;
    readonly host: string;
    readonly user: string;
    readonly ipAddress: string;
    readonly workingDirectory: string;
}

/**
 * Formats a run offset in seconds as a zero-padded `H:MM:SS` clock, always including the
 * hour field.
 *
 * @param offsetSeconds  Seconds elapsed from the run start.
 * @returns The `H:MM:SS` string.
 */
function formatOffset(offsetSeconds: number): string {
    const totalSeconds = Math.max(0, Math.round(offsetSeconds));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Formats a duration in seconds as a compact human-readable string (`12s`, `3m 7s`, `1h 4m`),
 * for the relative durations shown in the row tooltip.
 *
 * @param seconds  The duration in seconds.
 * @returns The compact duration string.
 */
function formatCompactDuration(seconds: number): string {
    const totalSeconds = Math.max(0, Math.round(seconds));
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    if (minutes < 60) return `${minutes}m ${totalSeconds % 60}s`;
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

/**
 * Builds the per-row hover tooltip: the full command line as the title, the absolute clock
 * time, the gap since the previous command, the elapsed time on the active level, and the
 * sandbox.
 *
 * @param entry  The command entry.
 * @returns The rich-tooltip model.
 */
function buildCommandTooltip(entry: CommandLogEntry): RichTooltipModel {
    const rows: RichTooltipRow[] = [
        { label: 'Time', value: format(entry.timestamp, 'MMM d, HH:mm:ss') },
        {
            label: 'Since previous',
            value:
                entry.secondsSincePreviousCommand === null
                    ? 'First command'
                    : `+${formatCompactDuration(entry.secondsSincePreviousCommand)}`,
        },
    ];
    if (entry.secondsIntoLevel !== null) {
        rows.push({ label: 'Time on level', value: formatCompactDuration(entry.secondsIntoLevel) });
    }
    rows.push({ label: 'Sandbox', value: entry.sandboxId });
    return { title: entry.commandLine, rows };
}

/**
 * Chronological console-command log for one selected run: a sortable, signal-native Material
 * table of every command with its run offset, full command line, active level, host, source
 * IP and working directory, plus a full-detail CSV export.
 */
@Component({
    selector: 'crczp-commands-log-table',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ChartPanelShellComponent, MatTableModule, MatSortModule, RichTooltipDirective],
    templateUrl: './commands-log-table.component.html',
    styleUrl: './commands-log-table.component.scss',
})
export class CommandsLogTableComponent implements ChartPanelInputs, CsvExportable<CommandLogCsvRow> {
    readonly instanceId: InputSignal<number> = input.required<number>();
    readonly runId: InputSignal<number | null> = input<number | null>(null);

    private readonly entityResolver = inject(EntityResolverService);

    private readonly source = createCommandsLogSource(this.instanceId, this.runId);

    private readonly resolvedLevels = toSignal(resolveInstanceLevels(this.instanceId, this.entityResolver), {
        initialValue: null,
    });

    /** Definition level titles keyed by order, for the level column and CSV. */
    private readonly levelTitleByOrder: Signal<ReadonlyMap<number, string>> = computed(() => {
        const resolved = this.resolvedLevels();
        const byOrder = new Map<number, string>();
        if (resolved) for (const level of resolved.levels) byOrder.set(level.order, level.title);
        return byOrder;
    });

    protected readonly displayedColumns = DISPLAYED_COLUMNS;

    protected readonly status: Signal<ChartSourceStatus> = this.source.status;

    /** Empty-state message distinguishing no-run-selected from a run with no commands. */
    protected readonly emptyMessage = computed(() =>
        !isRunSelected(this.runId()) ? 'Select a run to view its commands' : 'No commands recorded for this run',
    );

    protected readonly sortState = signal<{ active: string; direction: SortDir }>({
        active: 'time',
        direction: 'asc',
    });

    /** Command entries joined with level titles and prepared for display. */
    private readonly displayRows: Signal<readonly CommandLogDisplayRow[]> = computed(() => {
        const vm = this.source.vm();
        if (!vm) return [];
        const titles = this.levelTitleByOrder();
        return vm.entries.map((entry) => this.toDisplayRow(entry, titles));
    });

    protected readonly sortedRows = computed<readonly CommandLogDisplayRow[]>(() => {
        const { active, direction } = this.sortState();
        const factor = direction === 'asc' ? 1 : -1;
        const copy = [...this.displayRows()];
        copy.sort((rowA, rowB) => factor * this.compareBy(active, rowA, rowB));
        return copy;
    });

    protected readonly trackById = (_index: number, row: CommandLogDisplayRow): string => row.id;

    protected onSortChange(sort: Sort): void {
        this.sortState.set({ active: sort.active, direction: sort.direction || 'asc' });
    }

    /**
     * Prepares one command entry for display: formats its offset, level, host, IP and working
     * directory, and builds its hover tooltip.
     *
     * @param entry   The command entry.
     * @param titles  Level titles keyed by order.
     * @returns The display row.
     */
    private toDisplayRow(entry: CommandLogEntry, titles: ReadonlyMap<number, string>): CommandLogDisplayRow {
        const host = this.formatHost(entry.username, entry.hostname);
        return {
            id: entry.id,
            offsetSeconds: entry.offsetSeconds,
            offsetText: formatOffset(entry.offsetSeconds),
            commandLine: entry.commandLine,
            tool: entry.tool,
            argumentsSuffix: entry.commandArguments ? ` ${entry.commandArguments}` : '',
            toolColor: commandColor(entry.tool),
            levelOrder: entry.levelOrder,
            levelText: this.levelLabel(entry.levelOrder, titles) ?? EMPTY_CELL,
            hostText: host || EMPTY_CELL,
            ipText: entry.ipAddress ?? EMPTY_CELL,
            workingDirectoryText: entry.workingDirectory ?? EMPTY_CELL,
            tooltip: buildCommandTooltip(entry),
        };
    }

    /**
     * Joins OS user and host into a `user@host` string, tolerating either part being absent.
     *
     * @param username  The OS user, or null.
     * @param hostname  The host, or null.
     * @returns The combined string, or an empty string when both are absent.
     */
    private formatHost(username: string | null, hostname: string | null): string {
        if (username && hostname) return `${username}@${hostname}`;
        return username ?? hostname ?? '';
    }

    /**
     * Formats a level order as `{number} · {title}` (1-based), the bare 1-based number when no
     * title is known, or null when the command could not be attributed to a level.
     *
     * @param levelOrder  The 0-based level order, or null.
     * @param titles      Level titles keyed by order.
     * @returns The level label, or null when unattributed.
     */
    private levelLabel(levelOrder: number | null, titles: ReadonlyMap<number, string>): string | null {
        if (levelOrder === null) return null;
        const title = titles.get(levelOrder);
        return title ? `${levelOrder + 1} · ${title}` : `${levelOrder + 1}`;
    }

    /**
     * Compares two rows by the active sort column.
     *
     * @param column  The active column key.
     * @param rowA    The first row.
     * @param rowB    The second row.
     * @returns A negative, zero or positive ordering number.
     */
    private compareBy(column: string, rowA: CommandLogDisplayRow, rowB: CommandLogDisplayRow): number {
        switch (column) {
            case 'time':
                return rowA.offsetSeconds - rowB.offsetSeconds;
            case 'command':
                return rowA.commandLine.toLowerCase().localeCompare(rowB.commandLine.toLowerCase());
            case 'level': {
                const orderA = rowA.levelOrder ?? Number.MAX_SAFE_INTEGER;
                const orderB = rowB.levelOrder ?? Number.MAX_SAFE_INTEGER;
                return orderA - orderB;
            }
            case 'host':
                return rowA.hostText.toLowerCase().localeCompare(rowB.hostText.toLowerCase());
            case 'ip':
                return rowA.ipText.localeCompare(rowB.ipText);
            case 'wd':
                return rowA.workingDirectoryText.toLowerCase().localeCompare(rowB.workingDirectoryText.toLowerCase());
            default:
                return 0;
        }
    }

    csvFilename(): string {
        const runId = this.runId();
        return runId ? `commands-log-run-${runId}.csv` : 'commands-log.csv';
    }

    csvColumns(): ReadonlyArray<CsvColumn<CommandLogCsvRow>> {
        return [
            { header: 'Trainee', value: (row) => row.traineeName },
            { header: 'Login', value: (row) => row.login },
            { header: 'Email', value: (row) => row.email },
            { header: 'Offset', value: (row) => row.offset },
            { header: 'Timestamp', value: (row) => row.timestamp },
            { header: 'Command', value: (row) => row.command },
            { header: 'Arguments', value: (row) => row.arguments },
            { header: 'Level', value: (row) => row.level },
            { header: 'Host', value: (row) => row.host },
            { header: 'User', value: (row) => row.user },
            { header: 'Source IP', value: (row) => row.ipAddress },
            { header: 'Working directory', value: (row) => row.workingDirectory },
        ];
    }

    async csvRows(): Promise<ReadonlyArray<CommandLogCsvRow>> {
        const vm = this.source.vm();
        if (!vm || vm.entries.length === 0) return [];

        const userId = vm.userId;
        const user =
            userId === null
                ? undefined
                : (await lastValueFrom(this.entityResolver.resolveMap(EntityType.User, [userId]))).get(userId);
        const traineeName = user?.name ?? user?.login ?? (userId === null ? '' : String(userId));
        const login = user?.login ?? '';
        const email = user?.mail ?? '';
        const titles = this.levelTitleByOrder();

        return vm.entries.map(
            (entry): CommandLogCsvRow => ({
                traineeName,
                login,
                email,
                offset: formatOffset(entry.offsetSeconds),
                timestamp: formatISO(entry.timestamp),
                command: entry.tool,
                arguments: entry.commandArguments,
                level: this.levelLabel(entry.levelOrder, titles) ?? '',
                host: entry.hostname ?? '',
                user: entry.username ?? '',
                ipAddress: entry.ipAddress ?? '',
                workingDirectory: entry.workingDirectory ?? '',
            }),
        );
    }
}
