import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { EntityResolverService } from '@crczp/event-query-engine';
import { LinearTrainingDefinitionApi } from '@crczp/training-api';
import { ClickOutsideDirective, NotificationService } from '@crczp/utils';
import { from } from 'rxjs';
import {
    AnswerHighlight,
    AssessmentCsvRow,
    assessmentCsvColumns,
    assessmentCsvRows,
    AssessmentDetailComponent,
    AssessmentOption,
    AssessmentVm,
    ChartPanelShellComponent,
    createAssessmentSource,
    CsvColumn,
    CsvExportable,
    defaultSort,
    exportCsv,
    indexAssessmentAnswers,
    InstanceId,
    TraineeHighlight,
    TraineeIdentity,
    TraineeListComponent,
    traineeComparator,
    traineeSortFields,
    TraineeSortFields,
} from '@crczp/components';

/** Answer index used whenever no assessment is selected, including a failed resolution. */
const EMPTY_INDEX: ReadonlyMap<string, AnswerHighlight> = new Map();

/** A trainee's run id paired with its sortable fields, ranked to find the default focused trainee. */
type SortableTraineeRow = TraineeSortFields & { readonly runId: number };

/**
 * Returns the first list entry matching the predicate, falling back to the first
 * entry of the list, or null when the list is empty.
 *
 * @param list      The list to pick from.
 * @param isPicked  Predicate identifying the preferred entry.
 * @returns The matched entry, else the first entry, else null.
 */
function pickOrFirst<T>(list: readonly T[], isPicked: (item: T) => boolean): T | null {
    return list.find(isPicked) ?? list[0] ?? null;
}

/**
 * Assessment dashboard view. Reconciles the run's assessment answers with the
 * training definition through a live query source, then presents an assessment
 * stepper, a trainee roster with per-assessment results, and the selected
 * assessment's detail. The active assessment is a local signal and the focused
 * trainee is the shared URL-fragment selection; the highlight is stored as a key
 * resolved live against the model — all independent of the data view-model, so a
 * live poll never resets the instructor's focus.
 */
@Component({
    selector: 'crczp-assessment-view',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ChartPanelShellComponent,
        TraineeListComponent,
        AssessmentDetailComponent,
        ClickOutsideDirective,
    ],
    templateUrl: './assessment-view.component.html',
    styleUrl: './assessment-view.component.scss',
})
export class AssessmentViewComponent implements CsvExportable<AssessmentCsvRow> {
    private readonly resolver = inject(EntityResolverService);
    private readonly definitionApi = inject(LinearTrainingDefinitionApi);
    private readonly notificationService = inject(NotificationService);

    /** Identifies the instance whose assessment data is shown. */
    readonly instanceId = input.required<InstanceId>();

    /** Focused trainee's run id from the shared URL fragment, or null when none. */
    readonly selectedTraineeRunId = input.required<number | null>();

    /** Emits the run id to make focused, mirrored into the shared URL fragment. */
    readonly selectedTraineeRunIdChange = output<number | null>();

    private readonly source = createAssessmentSource(this.instanceId, this.resolver, this.definitionApi);

    /** Live status of the reconciled assessment data. */
    protected readonly status = this.source.status;

    /** Reconciled dashboard view-model, or null before the first emission. */
    protected readonly vm = this.source.vm;

    /** Order of the assessment the instructor picked, or null for the default. */
    private readonly selectedOrder = signal<number | null>(null);

    /** Key of the highlighted answer, or null when no answer is highlighted. */
    private readonly highlightKey = signal<string | null>(null);

    /** Every assessment of the run, in definition order. */
    private readonly assessments = computed<readonly AssessmentVm[]>(() => this.vm()?.assessments ?? []);

    /** Every trainee on the run, in the model's default order. */
    protected readonly trainees = computed<readonly TraineeIdentity[]>(() => this.vm()?.trainees ?? []);

    /** Assessment currently shown: the picked one, else the first. */
    protected readonly selectedAssessment = computed<AssessmentVm | null>(() => {
        const order = this.selectedOrder();
        return pickOrFirst(this.assessments(), (assessment) => assessment.order === order);
    });

    /** Dropdown options derived from the run's assessments, in run order. */
    protected readonly assessmentOptions = computed<readonly AssessmentOption[]>(() =>
        this.assessments().map((assessment) => ({
            order: assessment.order,
            title: assessment.title,
            kind: assessment.kind,
        })),
    );

    /** First trainee by the assessment's default sort, the focused-trainee fallback. */
    private readonly defaultFocusedTraineeRunId = computed<number | null>(() => {
        const trainees = this.trainees();
        if (trainees.length === 0) {
            return null;
        }
        const assessment = this.selectedAssessment();
        const results = assessment?.results ?? null;
        const ordered: SortableTraineeRow[] = trainees
            .map((trainee) => ({ runId: trainee.runId, ...traineeSortFields(trainee.name, results?.get(trainee.runId)) }))
            .sort(traineeComparator(defaultSort(assessment?.scored ?? false)));
        return ordered[0]?.runId ?? null;
    });

    /** Focused trainee: the fragment's selection when still present, else first-by-sort. */
    protected readonly focusedTraineeRunId = computed<number | null>(() => {
        const selected = this.selectedTraineeRunId();
        const picked = this.trainees().find((trainee) => trainee.runId === selected);
        return picked?.runId ?? this.defaultFocusedTraineeRunId();
    });

    /** Every answer of the shown assessment, indexed live by key for highlight lookup. */
    private readonly answerIndex = computed<ReadonlyMap<string, AnswerHighlight>>(() => {
        const assessment = this.selectedAssessment();
        return assessment ? indexAssessmentAnswers(assessment) : EMPTY_INDEX;
    });

    /** The highlighted answer resolved against the current model, or null when none. */
    protected readonly highlight = computed<AnswerHighlight | null>(() => {
        const key = this.highlightKey();
        return key === null ? null : (this.answerIndex().get(key) ?? null);
    });

    /** Run ids to emphasise in the roster, or null when no answer is highlighted. */
    protected readonly highlightedRunIds = computed<ReadonlySet<number> | null>(
        () => this.highlight()?.choosers ?? null,
    );

    /**
     * Active trainee highlight shared by the roster and the question bodies: a
     * selected common answer highlights its choosers with the answer emphasis; with
     * none selected it falls back to the focused trainee with the trainee emphasis, or
     * null when no trainee is focused.
     */
    protected readonly traineeHighlight = computed<TraineeHighlight | null>(() => {
        const choosers = this.highlightedRunIds();
        if (choosers !== null) {
            return { kind: 'answer', runIds: choosers };
        }
        const focused = this.focusedTraineeRunId();
        return focused === null ? null : { kind: 'trainee', runId: focused };
    });

    /**
     * Records the assessment the instructor selected, clearing any active highlight.
     *
     * @param order Order of the assessment the instructor picked.
     */
    protected onAssessmentSelected(order: number): void {
        this.selectedOrder.set(order);
        this.highlightKey.set(null);
    }

    /** Exports the shown assessment as a CSV, notifying the user when the export fails. */
    protected downloadCsv(): void {
        from(exportCsv(this)).subscribe({
            error: () => this.notificationService.emit('error', 'Could not export CSV.'),
        });
    }

    /**
     * Makes the run id the new focused trainee through the shared selection output and
     * releases any active answer highlight, switching the view to that trainee's own
     * accent highlight.
     *
     * @param runId Run id of the trainee to make focused.
     */
    protected onFocusedTraineeChange(runId: number): void {
        this.highlightKey.set(null);
        this.selectedTraineeRunIdChange.emit(runId);
    }

    /**
     * Toggles the clicked answer's highlight: activates it to reveal its choosers in
     * the roster, or releases it when already active so the view falls back to the
     * focused trainee's own answers.
     *
     * @param key Key of the answer to toggle.
     */
    protected onAnswerActivated(key: string): void {
        this.highlightKey.update((current) => (current === key ? null : key));
    }

    /** Releases the active answer highlight. */
    protected releaseHighlight(): void {
        this.highlightKey.set(null);
    }

    /** @returns The shown assessment's title as the CSV file name, else a default. */
    csvFilename(): string {
        return this.selectedAssessment()?.title ?? 'assessment';
    }

    /**
     * @returns Column definitions for the long-format CSV, in output order:
     *          trainee identity, question number/title/type, whether answered,
     *          the trainee's answer, its correctness, points gained, and the
     *          question's maximum points.
     */
    csvColumns(): ReadonlyArray<CsvColumn<AssessmentCsvRow>> {
        return assessmentCsvColumns();
    }

    /**
     * Builds one CSV row per (submitting trainee × question) of the shown assessment.
     * Emits an error notification and returns nothing when no data is available.
     *
     * @returns The long-format rows, in trainee order then question order.
     */
    csvRows(): ReadonlyArray<AssessmentCsvRow> {
        const assessment = this.selectedAssessment();
        const rows = assessment ? assessmentCsvRows(assessment, this.trainees()) : [];
        if (rows.length === 0) {
            this.notificationService.emit('error', 'No assessment data to export.');
        }
        return rows;
    }
}
