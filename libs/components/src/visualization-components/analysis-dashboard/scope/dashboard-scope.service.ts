import { Signal } from '@angular/core';

/** Which of the two dashboard views is active. */
export type DashboardView = 'aggregated' | 'trainee';

/**
 * Page-level scope shared by the toolbar, view switch, and run selector. Panels do
 * not depend on this to function — they receive `instanceId` (and `runId`) as
 * inputs — but the dashboard shell provides it to coordinate the toolbar with the
 * panels. Injectable abstraction with a route-provided default
 * (see `provideDashboardScope`).
 */
export abstract class DashboardScopeContext {
    abstract readonly instanceId: Signal<number>;
    abstract readonly view: Signal<DashboardView>;
    /** The trainee run selected in trainee view, or null before one is chosen. */
    abstract readonly selectedRunId: Signal<number | null>;

    abstract setView(view: DashboardView): void;
    abstract selectRun(runId: number | null): void;
}
