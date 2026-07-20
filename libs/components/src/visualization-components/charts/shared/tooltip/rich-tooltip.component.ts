import { ChangeDetectionStrategy, Component, computed, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

/** A single label/value detail line in a structured rich tooltip. */
export interface RichTooltipRow {
    /** Row label, rendered in the distinguished label colour. */
    readonly label: string;
    /** Row value, rendered in the primary text colour. */
    readonly value: string;
    /** Optional colour override for the value text, e.g. green for a correct answer. */
    readonly valueColor?: string;
}

/** Structured rich-tooltip content: a root title plus detail rows beneath it. */
export interface RichTooltipModel {
    /** Title shown as the tooltip root/header. */
    readonly title?: string;
    /** Optional colour override for the title text and its icon, e.g. red for a wrong answer. */
    readonly titleColor?: string;
    /** Optional Material Icons ligature rendered before the title, in the title colour. */
    readonly titleIcon?: string;
    /** Detail rows shown beneath the title. */
    readonly rows: readonly RichTooltipRow[];
}

/** Content accepted by the rich tooltip: structured model, plain text, or a template. */
export type RichTooltipContent = string | RichTooltipModel | TemplateRef<unknown>;

/**
 * Floating tooltip surface rendered inside a CDK overlay by {@link RichTooltipDirective}.
 * Styled to match the dashboard's ECharts tooltips. Renders a structured title/row model,
 * a plain string (multi-line via newlines), or a projected template.
 */
@Component({
    selector: 'crczp-rich-tooltip',
    standalone: true,
    imports: [NgTemplateOutlet],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './rich-tooltip.component.html',
    styleUrl: './rich-tooltip.component.scss',
    host: { role: 'tooltip' },
})
export class RichTooltipComponent {
    /** Tooltip content: a structured model, a plain string, or a template. */
    readonly content = input<RichTooltipContent | null>(null);

    /** The content as a structured model when one was supplied, otherwise null. */
    protected readonly modelContent = computed<RichTooltipModel | null>(() => {
        const value = this.content();
        if (value === null || typeof value === 'string' || value instanceof TemplateRef) return null;
        return value;
    });

    /** The content as a template when one was supplied, otherwise null. */
    protected readonly templateContent = computed<TemplateRef<unknown> | null>(() => {
        const value = this.content();
        return value instanceof TemplateRef ? value : null;
    });

    /** The content as text when a string was supplied, otherwise an empty string. */
    protected readonly textContent = computed<string>(() => {
        const value = this.content();
        return typeof value === 'string' ? value : '';
    });
}
