/** Tunable configuration shared across analysis-dashboard panels. */
export interface DashboardConfig {
    /** Maximum number of rows the live event feed retains, ordered newest-first. */
    readonly liveFeedMaxRows: number;
    /** Tick interval (ms) for live elapsed/relative-time clocks. */
    readonly clockTickMs: number;
}

/** Default analysis-dashboard configuration. */
export const DASHBOARD_CONFIG: DashboardConfig = {
    liveFeedMaxRows: 100,
    clockTickMs: 10_000,
};
