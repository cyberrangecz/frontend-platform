import { EnvironmentProviders, inject, Injectable, InjectionToken, makeEnvironmentProviders, signal } from '@angular/core';
import { DashboardScopeContext, DashboardView } from './dashboard-scope.service';

export interface DashboardScopeConfig {
    /** Instance the dashboard analyzes; typically read from the route param. */
    readonly instanceId: number;
}

const DASHBOARD_SCOPE_CONFIG = new InjectionToken<DashboardScopeConfig>('DASHBOARD_SCOPE_CONFIG');

/** Default signal-backed {@link DashboardScopeContext}, seeded from the route config. */
@Injectable()
export class DefaultDashboardScopeContext extends DashboardScopeContext {
    private readonly viewState = signal<DashboardView>('aggregated');
    private readonly selectedRunIdState = signal<number | null>(null);
    private readonly instanceIdState = signal(inject(DASHBOARD_SCOPE_CONFIG).instanceId);

    readonly instanceId = this.instanceIdState.asReadonly();
    readonly view = this.viewState.asReadonly();
    readonly selectedRunId = this.selectedRunIdState.asReadonly();

    setView(view: DashboardView): void {
        this.viewState.set(view);
    }

    selectRun(runId: number | null): void {
        this.selectedRunIdState.set(runId);
    }
}

/** Registers the dashboard scope for a route; seed it with the resolved instance id. */
export function provideDashboardScope(config: DashboardScopeConfig): EnvironmentProviders {
    return makeEnvironmentProviders([
        { provide: DASHBOARD_SCOPE_CONFIG, useValue: config },
        { provide: DashboardScopeContext, useClass: DefaultDashboardScopeContext },
    ]);
}
