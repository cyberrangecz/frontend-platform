import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { from } from 'rxjs';
import { eq } from 'drizzle-orm';
import { CacheService, levelStartedTable, RawEventRow } from '@crczp/event-query-engine';
import { PlatformEventType } from '@crczp/training-model';

const PROBE_INSTANCE_ID = 1;

/**
 * Builds a complete level_started event row for the probe instance.
 *
 * @param timestamp Epoch-millisecond event timestamp, also used to derive a unique id.
 * @returns A fully populated raw event row routed to the level_started table.
 */
function makeProbeRow(timestamp: number): RawEventRow {
    return {
        id: `probe-${timestamp}`,
        type: PlatformEventType.LEVEL_STARTED,
        instance_id: PROBE_INSTANCE_ID,
        timestamp,
        sandbox_id: 'probe-sandbox',
        pool_id: 10,
        training_definition_id: 20,
        training_instance_id: 30,
        training_run_id: 40,
        level_id: 50,
        user_ref_id: 60,
        training_time: 12.5,
        level_order: 1,
        actual_score_in_level: 5,
        total_training_level_score: 10,
        total_assessment_level_score: 15,
        level_type: 'TRAINING',
        level_title: 'Probe Level',
        max_score: 100,
    };
}

/**
 * Test-fixture page that exercises the SQLite cache worker through the public
 * {@link CacheService} contract and exposes the outcome in the DOM for Playwright.
 * It reads the persisted row count on load so a reload can confirm OPFS durability.
 */
@Component({
    selector: 'crczp-cache-probe',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button type="button" data-testid="insert" (click)="insert()">insert</button>
        <button type="button" data-testid="read" (click)="read()">read</button>
        <button type="button" data-testid="erase" (click)="erase()">erase</button>
        <div data-testid="status">{{ status() }}</div>
        <div data-testid="count">{{ count() }}</div>
        <div data-testid="error">{{ error() }}</div>
    `,
})
export class CacheProbePage {
    private readonly cache = inject(CacheService);

    protected readonly status = signal('init');
    protected readonly count = signal(-1);
    protected readonly error = signal('');

    constructor() {
        this.read();
    }

    /** Inserts a fixed batch of three rows for the probe instance. */
    insert(): void {
        this.status.set('inserting');
        const now = Date.now();
        this.cache.insert([makeProbeRow(now), makeProbeRow(now + 1), makeProbeRow(now + 2)]).subscribe({
            next: () => {
                this.status.set('insert-ok');
                this.read();
            },
            error: (err: unknown) => this.fail(err),
        });
    }

    /** Reads the persisted row count for the probe instance and renders it. */
    read(): void {
        this.cache
            .query<{ id: string }>((db) =>
                from(
                    db
                        .select({ id: levelStartedTable.id })
                        .from(levelStartedTable)
                        .where(eq(levelStartedTable.instance_id, PROBE_INSTANCE_ID)),
                ),
            )
            .subscribe({
                next: (rows) => {
                    this.count.set(rows.length);
                    this.status.set('read-ok');
                },
                error: (err: unknown) => this.fail(err),
            });
    }

    /** Removes all cached data for the probe instance. */
    erase(): void {
        this.status.set('erasing');
        this.cache.purge(PROBE_INSTANCE_ID).subscribe({
            next: () => {
                this.status.set('erase-ok');
                this.read();
            },
            error: (err: unknown) => this.fail(err),
        });
    }

    private fail(err: unknown): void {
        this.status.set('error');
        this.error.set(err instanceof Error ? err.message : String(err));
    }
}
