import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PALETTE } from '../theme/event-type-colors';
import { AnswerCorrectness } from './answer-tokens';

/**
 * Horizontal proportion bar for one answer's share of the respondents, tinted by
 * correctness and trailed by a count-and-percent stat pill. The track always
 * renders, so a correct answer nobody chose still reads as an empty bar at zero,
 * never as absent.
 */
@Component({
    selector: 'crczp-distribution-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './distribution-bar.component.html',
    styleUrl: './distribution-bar.component.scss',
})
export class DistributionBarComponent {
    /** Number of respondents who chose this answer. */
    readonly count = input.required<number>();

    /** This answer's share of the question's respondents, in the range 0 to 100. */
    readonly percent = input.required<number>();

    /** Correctness classification driving the fill tint. */
    readonly correctness = input.required<AnswerCorrectness>();

    /** Fill colour for the current correctness. */
    protected readonly fillColor = computed<string>(() => CORRECTNESS_FILL_COLOR[this.correctness()]);

    /** Stat-pill text colour for the current correctness, verified against the pill's fixed background at ≥4.5:1. */
    protected readonly statTextColor = computed<string>(() => CORRECTNESS_STAT_TEXT_COLOR[this.correctness()]);

    /** Fill fraction from 0 to 1, clamped, applied as a `scaleX` transform. */
    protected readonly fillScale = computed<number>(() => Math.max(0, Math.min(100, this.percent())) / 100);

    /** Count and rounded percent rendered in the trailing stat pill. */
    protected readonly statLabel = computed<string>(() => `${this.count()} · ${Math.round(this.percent())}%`);
}

/** Correctness-to-palette mapping for the bar fill. */
const CORRECTNESS_FILL_COLOR: Record<AnswerCorrectness, string> = {
    correct: PALETTE.green.color,
    incorrect: PALETTE.red.color,
    neutral: PALETTE.gray.color,
};

/**
 * Correctness-to-text-colour mapping for the stat pill, darkened relative to
 * {@link CORRECTNESS_FILL_COLOR} so the readout clears 4.5:1 against the pill's
 * fixed neutral background at its 11px size.
 */
const CORRECTNESS_STAT_TEXT_COLOR: Record<AnswerCorrectness, string> = {
    correct: '#1b5e20',
    incorrect: PALETTE.red.color,
    neutral: '#616161',
};
