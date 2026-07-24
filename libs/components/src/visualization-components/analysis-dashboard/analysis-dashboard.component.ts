import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { from } from 'rxjs';
import { providePauseGate } from '../charts/shared';
import { SegmentedToggleComponent, SegmentedToggleOption } from '../../segmented-toggle/segmented-toggle.component';
import { InstanceId } from '../charts/progress';
import { AggregatedViewComponent } from './views/aggregated-view.component';
import { IndividualViewComponent } from './views/individual-view.component';
import { AssessmentViewComponent } from './views/assessment-view.component';

type DashboardView = 'aggregated' | 'individual' | 'assessment';

/** View and trainee selection encoded in the dashboard URL fragment. */
interface DashboardLocation {
    view: DashboardView;
    runId: number | null;
}

/**
 * Parses a URL-fragment segment into a run id.
 *
 * @param raw Raw run-id segment, or undefined when absent.
 * @returns The integer run id, or null when absent or malformed.
 */
function parseRunId(raw: string | undefined): number | null {
    const runId = raw ? Number(raw) : Number.NaN;
    return Number.isInteger(runId) ? runId : null;
}

/**
 * Parses the URL fragment into the dashboard view and selected run.
 * Recognizes `individual/<runId>` and `assessment/<runId>`; anything else resolves
 * to the aggregated view.
 *
 * @param fragment Raw fragment value read from the active route.
 * @returns The decoded view and run selection.
 */
function parseFragment(fragment: string | null | undefined): DashboardLocation {
    const segments = (fragment ?? '').split('/');
    if (segments[0] === 'assessment') {
        return { view: 'assessment', runId: parseRunId(segments[1]) };
    }
    if (segments[0] === 'individual') {
        return { view: 'individual', runId: parseRunId(segments[1]) };
    }
    return { view: 'aggregated', runId: null };
}

/**
 * Builds the URL fragment for a view and trainee selection.
 * Appends the run id for the individual and assessment views when one is selected.
 *
 * @param view Active dashboard view.
 * @param runId Selected run id, or null when no trainee is selected.
 * @returns The fragment string to write to the URL.
 */
function buildFragment(view: DashboardView, runId: number | null): string {
    return (view === 'individual' || view === 'assessment') && runId !== null ? `${view}/${runId}` : view;
}

@Component({
    selector: 'crczp-analysis-dashboard',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [SegmentedToggleComponent, AggregatedViewComponent, IndividualViewComponent, AssessmentViewComponent],
    providers: [...providePauseGate()],
    templateUrl: './analysis-dashboard.component.html',
    styleUrl: './analysis-dashboard.component.scss',
})
export class AnalysisDashboardComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly instanceId = input.required<InstanceId>();
    // #TODO: derive instanceName from instanceId via event-query-engine once entity resolution is wired
    readonly instanceName = input<string>('');

    private readonly fragment = toSignal(this.route.fragment, { requireSync: true });

    /** View and trainee selection decoded from the URL fragment. */
    private readonly location = computed<DashboardLocation>(() => parseFragment(this.fragment()));

    /** Active view, derived from the URL fragment; defaults to aggregated when absent or unrecognized. */
    protected readonly view = computed<DashboardView>(() => this.location().view);

    /** Run selected in the individual and assessment views, derived from the URL fragment. */
    protected readonly selectedRunId = computed<number | null>(() => this.location().runId);

    /** Segments shown in the dashboard view toggle. */
    protected readonly viewOptions = [
        { value: 'aggregated', label: 'Aggregated', icon: 'groups' },
        { value: 'individual', label: 'Individual', icon: 'person' },
        { value: 'assessment', label: 'Assessment', icon: 'assignment' },
    ] satisfies readonly SegmentedToggleOption[];

    protected onViewChanged(view: string): void {
        this.navigateToFragment(buildFragment(view as DashboardView, this.selectedRunId()));
    }

    protected onRunSelected(runId: number | null): void {
        this.navigateToFragment(buildFragment(this.view(), runId));
    }

    /**
     * Replaces the URL fragment in place, without adding a history entry.
     *
     * @param fragment Fragment value to write to the active route.
     */
    private navigateToFragment(fragment: string): void {
        from(this.router.navigate([], { relativeTo: this.route, fragment, replaceUrl: true })).subscribe();
    }
}
