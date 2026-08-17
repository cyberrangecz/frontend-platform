import { CdkMenu, CdkMenuItemRadio, CdkMenuTrigger } from '@angular/cdk/menu';
import { formatNumber } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, LOCALE_ID, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { OverflowTooltipDirective } from '@crczp/utils';
import { PALETTE } from '../shared';
import { QuestionBodyContext, TraineeHighlight } from './answer-faces';
import { AssessmentKind, AssessmentVm, TraineeIdentity } from './assessment-view.model';
import { EmiBodyComponent } from './emi-body.component';
import { FfqBodyComponent } from './ffq-body.component';
import { McqBodyComponent } from './mcq-body.component';
import { QuestionFrameComponent } from './question-frame.component';

/** One header stat: a label and its display-ready value. */
interface AssessmentStat {
    /** Stat label shown above the value. */
    readonly label: string;
    /** Display-ready stat value. */
    readonly value: string | number;
}

/** One assessment offered in the title dropdown, in run order. */
export interface AssessmentOption {
    /** Zero-based position within the run's assessments; the selection key. */
    readonly order: number;
    /** Assessment title shown on the option. */
    readonly title: string;
    /** Whether the assessment is scored (TEST) or merely collected (QUIZ). */
    readonly kind: AssessmentKind;
}

/** One dropdown option prepared for rendering with its resolved kind icon. */
interface RenderOption extends AssessmentOption {
    /** Material icon name conveying the assessment kind. */
    readonly icon: string;
}

/** Material icon per assessment kind, the sole visual cue distinguishing them. */
const KIND_ICON: Record<AssessmentKind, string> = {
    TEST: 'fact_check',
    QUIZ: 'quiz',
};

/**
 * Detail panel for one assessment: a header of score/participation stats and the
 * stack of its questions, each rendered inside a shared frame. The group-mean stat
 * is shown only for scored assessments.
 */
@Component({
    selector: 'crczp-assessment-detail',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        QuestionFrameComponent,
        McqBodyComponent,
        EmiBodyComponent,
        FfqBodyComponent,
        OverflowTooltipDirective,
        CdkMenu,
        CdkMenuItemRadio,
        CdkMenuTrigger,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
    ],
    templateUrl: './assessment-detail.component.html',
    styleUrl: './assessment-detail.component.scss',
})
export class AssessmentDetailComponent {
    /** The assessment whose stats and questions are shown. */
    readonly assessment = input.required<AssessmentVm>();
    /** Every assessment of the run offered in the title dropdown, in run order. */
    readonly options = input.required<readonly AssessmentOption[]>();
    /** Emits the order of the assessment picked from the title dropdown. */
    readonly assessmentSelected = output<number>();
    /** Emits when the header's download button is pressed, requesting a CSV export. */
    readonly downloadCsv = output<void>();
    /** Every trainee of the run; resolved by question bodies to look up chooser faces. */
    readonly trainees = input.required<readonly TraineeIdentity[]>();
    /** The active trainee highlight, or null when nothing is highlighted. */
    readonly highlight = input<TraineeHighlight | null>(null);
    /** Key of the currently highlighted answer, or null when none is active. */
    readonly activeAnswerKey = input<string | null>(null);
    /** Emits the key of an answer whose surface was clicked, for highlighting. */
    readonly answerActivated = output<string>();
    /** Emits the run id of a clicked chooser face, for focused-trainee switching. */
    readonly faceActivated = output<number>();
    /** Gold highlight colour inherited by the focused trainee's surfaces. */
    protected readonly traineeHighlightColor = PALETTE.gold.color;
    /** Blue highlight colour inherited by the selected answer and chooser surfaces. */
    protected readonly answerHighlightColor = PALETTE.blue.color;
    private readonly locale = inject(LOCALE_ID);
    /** Header stats to render, with the group-mean stat included only when scored. */
    protected readonly stats = computed<readonly AssessmentStat[]>(() => {
        const vm = this.assessment();
        const stats: AssessmentStat[] = [
            { label: 'Takers', value: vm.takerCount },
            { label: 'Questions', value: vm.questionCount },
        ];
        if (vm.scored) {
            stats.push({
                label: 'Average points',
                value: formatNumber(vm.groupMeanScore, this.locale, '1.0-1'),
            });
            stats.push({ label: 'Max points', value: vm.maxPoints });
        }

        return stats;
    });
    /** Dropdown options prepared for the template with their kind icon. */
    protected readonly menuOptions = computed<readonly RenderOption[]>(() =>
        this.options().map((option) => ({
            ...option,
            icon: KIND_ICON[option.kind],
        })),
    );
    /** Trainee identities keyed by run id, resolved from the run's trainee list. */
    private readonly traineesByRunId = computed<
        ReadonlyMap<number, TraineeIdentity>
    >(
        () =>
            new Map(this.trainees().map((trainee) => [trainee.runId, trainee])),
    );
    /** The shared context every question body receives as a single binding. */
    protected readonly bodyContext = computed<QuestionBodyContext>(() => ({
        traineesByRunId: this.traineesByRunId(),
        highlight: this.highlight(),
        scored: this.assessment().scored,
    }));
}
