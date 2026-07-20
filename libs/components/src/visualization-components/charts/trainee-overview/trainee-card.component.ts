import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { OverflowTooltipDirective } from '@crczp/utils';
import { PALETTE } from '../shared';
import { LevelProgress, LevelStatus, TraineeRow } from './trainee-overview.model';

/** One stat in the card's run-wide summary strip. */
interface SummaryStat {
    readonly label: string;
    readonly value: string;
    /** Inline value colour, or null to inherit the default text colour. */
    readonly color: string | null;
    /** Optional secondary value shown beneath the primary value. */
    readonly secondary?: string;
}

/** One coloured segment of a level's detail line. */
interface DetailSegment {
    readonly text: string;
    /** Inline segment colour, or null to inherit the default detail colour. */
    readonly color: string | null;
}

/** Display model for one level row in the breakdown list. */
interface LevelRow {
    readonly order: number;
    readonly title: string;
    readonly status: LevelStatus;
    /** Status word followed by any non-zero wrong-answer, hint, and solution counts. */
    readonly detail: readonly DetailSegment[];
    readonly timeText: string;
    /** Score over maximum, or the maximum as points when not started. */
    readonly scoreText: string;
    /** Background colour of the status badge. */
    readonly badgeColor: string;
    /** Foreground colour of the status badge content. */
    readonly badgeForeground: string;
    /** Whether the row is the active (in-progress) level. */
    readonly highlighted: boolean;
}

const WHITE = '#ffffff';

/** Amber used for hint indicators; darker than the palette yellow for legibility on light surfaces. */
const HINT_COLOR = '#a98700';

/**
 * Full-profile information card for the selected trainee: a header with identity
 * and run state, a run-wide stat strip, and a per-level breakdown list.
 * Renders a prompt when nothing is selected.
 */
@Component({
    selector: 'crczp-trainee-card',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule, OverflowTooltipDirective],
    templateUrl: './trainee-card.component.html',
    styleUrl: './trainee-card.component.scss',
})
export class TraineeCardComponent {
    /** Trainee whose profile is shown, or null when none is selected. */
    readonly trainee = input<TraineeRow | null>(null);

    /** Data-URL form of the trainee avatar, or null when no picture is available. */
    protected readonly avatarSrc = computed<string | null>(() => {
        const raw = this.trainee()?.picture.trim() ?? '';
        return raw.length > 0 ? `data:image/png;base64,${raw}` : null;
    });

    /** Uppercase leading character of the trainee name, used for the no-picture placeholder. */
    protected readonly avatarInitial = computed<string>(() => {
        const name = this.trainee()?.name.trim() ?? '';
        return name.length > 0 ? name.charAt(0).toUpperCase() : '?';
    });

    /** Run-wide summary stats for the selected trainee; empty when none is selected. */
    protected readonly stats = computed<readonly SummaryStat[]>(() => {
        const trainee = this.trainee();
        if (!trainee) return [];
        const scoreStat: SummaryStat =
            trainee.assessmentScore > 0
                ? { label: 'Score', value: String(trainee.scoreTotal), color: null, secondary: `${trainee.assessmentScore} assessment` }
                : { label: 'Score', value: String(trainee.scoreTotal), color: null };
        return [
            { label: 'State', value: trainee.state === 'finished' ? 'Finished' : 'Running', color: trainee.state === 'finished' ? PALETTE.green.color : PALETTE.blue.color },
            scoreStat,
            { label: 'Levels', value: `${trainee.levelsCompleted}/${trainee.levelsTotal}`, color: null },
            { label: 'Elapsed', value: trainee.currentTimeText, color: null },
            { label: 'Wrong', value: String(trainee.wrongAnswersTotal), color: PALETTE.red.color },
            { label: 'Hints', value: String(trainee.hintsTotal), color: HINT_COLOR },
            { label: 'Solutions', value: String(trainee.solutionsTotal), color: PALETTE.deepOrange.color },
        ];
    });

    /** Per-level breakdown rows for the selected trainee; empty when none is selected. */
    protected readonly levelRows = computed<readonly LevelRow[]>(() => {
        const trainee = this.trainee();
        if (!trainee) return [];
        return trainee.levels.map((level) => this.toLevelRow(level));
    });

    /**
     * Builds the display model for one level.
     *
     * @param level The level progress to render.
     */
    private toLevelRow(level: LevelProgress): LevelRow {
        const cleared = level.status === 'cleared';
        const inProgress = level.status === 'in-progress';
        const notStarted = level.status === 'not-started';
        return {
            order: level.order,
            title: level.title,
            status: level.status,
            detail: this.buildDetail(level),
            timeText: level.timeText,
            scoreText: notStarted ? `${level.maxScore} pts` : `${level.score}/${level.maxScore}`,
            badgeColor: cleared ? PALETTE.green.color : inProgress ? PALETTE.blue.color : PALETTE.gray.bgColor,
            badgeForeground: notStarted ? PALETTE.gray.color : WHITE,
            highlighted: inProgress,
        };
    }

    /**
     * Composes a level's status word with its non-zero wrong-answer, hint, and
     * solution counts as colour-coded segments, in that order.
     *
     * @param level The level whose detail line to compose.
     */
    private buildDetail(level: LevelProgress): readonly DetailSegment[] {
        const statusWord = level.status === 'cleared' ? 'cleared' : level.status === 'in-progress' ? 'in progress' : 'not started';
        const segments: DetailSegment[] = [{ text: statusWord, color: null }];
        if (level.wrongCount > 0) {
            segments.push({ text: `${level.wrongCount} ${level.wrongCount === 1 ? 'wrong answer' : 'wrong answers'}`, color: PALETTE.red.color });
        }
        if (level.hintCount > 0) {
            segments.push({ text: `${level.hintCount} ${level.hintCount === 1 ? 'hint' : 'hints'}`, color: HINT_COLOR });
        }
        if (level.solutionCount > 0) {
            segments.push({ text: `${level.solutionCount} ${level.solutionCount === 1 ? 'solution' : 'solutions'}`, color: PALETTE.deepOrange.color });
        }
        return segments;
    }
}
