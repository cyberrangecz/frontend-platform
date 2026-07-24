import { RichTooltipModel } from './rich-tooltip.component';

const ESCAPE_MAP: Readonly<Record<string, string>> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
};

/**
 * Escapes the HTML-significant characters in a string so user/definition-derived
 * text can be embedded safely in a tooltip markup string.
 *
 * @param value  Raw text to escape.
 * @returns The text with `&`, `<`, `>` and `"` replaced by entities.
 */
function escapeHtml(value: string): string {
    return value.replace(/[&<>"]/g, (char) => ESCAPE_MAP[char] ?? char);
}

/** Maximum number of text lines a tooltip title or value renders before it is truncated with an ellipsis. */
const MAX_TOOLTIP_LINES = 5;

/**
 * Inline CSS that lets long text break anywhere, clamps it to {@link MAX_TOOLTIP_LINES} lines, and hides
 * the overflow so the last visible line ends in an ellipsis. Collapses the grid item's automatic minimum
 * size so a long unbreakable token cannot stretch the column past the tooltip surface.
 */
const LINE_CLAMP_STYLE =
    `overflow-wrap:anywhere;min-width:0;display:-webkit-box;` +
    `-webkit-box-orient:vertical;-webkit-line-clamp:${MAX_TOOLTIP_LINES};overflow:hidden`;

/**
 * Renders a {@link RichTooltipModel} to a self-contained HTML string visually
 * identical to the CDK-overlay `RichTooltipComponent`: a bordered surface with a
 * titled header and a two-column label/value grid (muted labels, emphasised values).
 *
 * This is the string-renderer strategy of the shared rich-tooltip abstraction — the
 * same model the DOM tooltips use, rendered for ECharts `tooltip.formatter` (whose
 * `appendToBody` surface lives in `document.body`, so the `@crczp/theme` CSS custom
 * properties below resolve exactly as they do for the CDK overlay). The host chart
 * should clear the native ECharts tooltip chrome (transparent background, zero
 * padding/border) so this surface is the only one shown. The surface forces
 * `white-space:normal` so long text wraps and clamps rather than inheriting the
 * ECharts tooltip element's default `white-space:nowrap`. Token values mirror
 * `rich-tooltip.component.scss`.
 *
 * @param model  Structured title/rows tooltip content.
 * @returns Tooltip surface as an HTML string.
 */
export function renderRichTooltipHtml(model: RichTooltipModel): string {
    const titleIcon = model.titleIcon
        ? `<span style="font-family:'Material Icons';font-size:var(--font-size-2xl);line-height:1;flex-shrink:0">` +
          `${escapeHtml(model.titleIcon)}</span>`
        : '';
    const title = model.title
        ? `<div style="padding-bottom:var(--space-2xs);margin-bottom:var(--space-xs);border-bottom:1px solid var(--neutral-90)">` +
          `<div style="display:flex;align-items:center;gap:var(--space-2xs);font-weight:var(--font-weight-semibold);font-size:var(--font-size-lg);` +
          `color:${model.titleColor ?? 'var(--neutral-10)'}">` +
          `${titleIcon}<span style="${LINE_CLAMP_STYLE}">${escapeHtml(model.title)}</span></div></div>`
        : '';

    const rows =
        model.rows.length > 0
            ? `<div style="display:grid;grid-template-columns:auto 1fr;column-gap:var(--space-xl);` +
              `row-gap:var(--space-xs);align-items:baseline">` +
              model.rows
                  .map(
                      (row) =>
                          `<span style="color:var(--neutral-50);font-weight:var(--font-weight-medium);white-space:nowrap">` +
                          `${escapeHtml(row.label)}</span>` +
                          `<span style="color:${row.valueColor ?? 'var(--neutral-20)'};${LINE_CLAMP_STYLE}">` +
                          `${escapeHtml(row.value)}</span>`,
                  )
                  .join('') +
              `</div>`
            : '';

    return (
        `<div style="max-width:24rem;padding:var(--space-sm) var(--space-md);border:1px solid var(--neutral-90);` +
        `border-radius:0.375rem;background:var(--background);color:var(--neutral-20);` +
        `font-size:var(--font-size-md);line-height:1.5;white-space:normal;box-shadow:0 2px 8px rgb(0 0 0 / 0.15)">` +
        `${title}${rows}</div>`
    );
}
