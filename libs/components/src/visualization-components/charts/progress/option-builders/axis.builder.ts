import { XAXisComponentOption, YAXisComponentOption } from 'echarts';
import { ChartPalette, PALETTE } from '../../shared';
import { OptionFragment } from '../types/option-fragment.types';
import { TraineeVm } from '../types/view-model.types';
import { AxisTimeScale } from './axis-time-scale';

/** Gold accent for the favourite pin glyph and favourited trainees' Y-axis label. */
const FAVOURITE_ACCENT_COLOR = PALETTE.gold.color;

const AXIS_POINTER_LABEL_BACKGROUND_COLOR = PALETTE.blue.bgColor;

/**
 * Material Icons codepoint for the `push_pin` glyph. Rendered with the
 * Material Icons font as a prefix on favourited trainee rows. Matches
 * the legacy implementation in `progress-DEPRECATED/echarts/chart-elements/labels.ts`.
 */
const FAVOURITE_PIN_CODEPOINT = '';

/**
 * Pixel size of the circular avatar rendered inside the Y-axis label.
 * 24px keeps the row height compact while remaining legible at a glance.
 */
const AVATAR_SIZE = 24;

/**
 * Translates the axis + trainee slices into the X-axis and Y-axis option
 * fragment.
 *
 *  - X-axis: `type: 'value'`, millisecond timestamps, `HH:mm:ss` label
 *    format via date-fns; date prefix added when `spansMidnight` is true.
 *  - Y-axis: `type: 'category'`, integer indices `[0, rowCount)`,
 *    `inverse: true`, `interval: 0`, `triggerEvent: true`. The trainee
 *    list drives the rich-text label dictionary; an empty `trainees`
 *    array yields blank labels.
 *
 * `rowCount` must always match the number of rows the bars layer is
 * about to draw — `api.coord([_, rowIndex])` resolves through the Y
 * category axis and silently returns invalid pixels when `rowIndex`
 * has no matching category.
 *
 * @param rowCount - Total Y-axis category slots, equal to `trainees.length`.
 * @param trainees - The ordered trainee list. Drives the rich-text label
 *                   dictionary.
 * @param colors - Resolved theme colours for split lines and label text.
 * @param timeScale - Active axis time scale supplying X-axis bounds and labels.
 * @returns A partial option with `xAxis` and `yAxis` set.
 */
export function buildAxisFragment(
    rowCount: number,
    trainees: readonly TraineeVm[],
    colors: ChartPalette,
    timeScale: AxisTimeScale,
): OptionFragment {
    return {
        xAxis: buildXAxis(colors, timeScale),
        yAxis: buildYAxis(rowCount, trainees, colors),
    };
}

/**
 * Builds the X-axis option. Value-type axis whose bounds and label text come
 * from the active timeScale: clock time in absolute mode (`HH:mm:ss`, or
 * `MMM d HH:mm:ss` across midnight), elapsed duration in duration mode.
 * Animation disabled so axis re-bounds repaint instantly.
 *
 * @param colors - Resolved theme colours for split lines and the pointer label.
 * @param timeScale - Active axis time scale supplying bounds and label text.
 * @returns The X-axis component option.
 */
function buildXAxis(colors: ChartPalette, timeScale: AxisTimeScale): XAXisComponentOption {
    return {
        type: 'value',
        min: timeScale.axisMin,
        max: timeScale.axisMax,
        splitLine: {
            show: true,
            lineStyle: {
                color: colors.gridLine,
                width: 1,
                type: 'solid',
            },
        },
        axisLabel: {
            formatter: (value: number | string) => timeScale.formatAxisLabel(Number(value)),
            showMinLabel: true,
            showMaxLabel: true,
        },
        axisPointer: {
            show: true,
            type: 'line',
            snap: false,
            triggerEmphasis: false,
            lineStyle: {
                color: colors.gridLine,
                width: 1,
                type: 'solid',
            },
            label: {
                show: true,
                backgroundColor: AXIS_POINTER_LABEL_BACKGROUND_COLOR,
                color: colors.text,
                formatter: (params: { value: number | string | Date }) =>
                    timeScale.formatAxisLabel(
                        params.value instanceof Date ? params.value.getTime() : Number(params.value),
                    ),
            },
        },
        animation: false,
    };
}

/**
 * Builds the Y-axis option. Category axis indexed by row position; one
 * slot per visible row. A `shadow` axis pointer paints a subtle band
 * across the row under the cursor as a hover highlight.
 *
 *  - Empty `trainees` (`trainees.length === 0`): renders blank labels —
 *    rows have no identity to show.
 *  - Otherwise: renders ECharts rich-text labels per row consisting of
 *    a circular avatar tile and the trainee display name, plus a gold
 *    pin glyph + bolded gold name for favourited trainees.
 *
 * ECharts rich-text styles are global to `axisLabel`, but tile images
 * (avatars) and per-trainee colour overrides need to vary per row. The
 * pattern used here — one rich style per row, keyed `avatar${index}`
 * and `name${index}` — is the documented workaround replicated from
 * the legacy implementation. The formatter then composes the rich-text
 * template per category by index lookup against the trainee list.
 *
 * @param rowCount - Number of category slots to emit.
 * @param trainees - Ordered trainee list. May be empty.
 * @param colors - Resolved theme colours for split lines and label text.
 * @returns The Y-axis component option.
 */
function buildYAxis(
    rowCount: number,
    trainees: readonly TraineeVm[],
    colors: ChartPalette,
): YAXisComponentOption {
    const data = Array.from({ length: rowCount }, (_unused, index) =>
        String(index),
    );

    const traineeByRowIndex = buildTraineeIndex(trainees);
    const rich = buildRichTextStyles(trainees, colors);
    const formatter = buildLabelFormatter(traineeByRowIndex);

    return {
        type: 'category',
        data,
        inverse: true,
        splitLine: {
            show: true,
            lineStyle: {
                color: colors.gridLine,
                width: 1,
                type: 'solid',
            },
        },
        axisLine: { show: true },
        axisTick: { show: true },
        axisLabel: {
            interval: 0,
            formatter,
            rich,
        },
        axisPointer: {
            show: true,
            type: 'shadow',
            z: 0,
            triggerEmphasis: false,
            triggerTooltip: false,
            label: { show: false },
            shadowStyle: {
                color: colors.accent,
                opacity: 0.08,
            },
        },
        triggerEvent: true,
        animation: false,
    };
}

/**
 * Builds an index from the category-axis row index to its `TraineeVm`.
 *
 * The Y-axis category value is the stringified row index (`"0"`, `"1"`,
 * …). The formatter receives that string and must resolve it back to
 * the trainee that owns the row. The lookup is built once per option
 * compose pass so the formatter closure stays O(1) per invocation
 * regardless of trainee count.
 *
 * @param trainees - Ordered trainee list, indexed by `rowIndex`.
 * @returns Sparse map keyed by `rowIndex`. Empty when the list is empty.
 */
function buildTraineeIndex(
    trainees: readonly TraineeVm[],
): ReadonlyMap<number, TraineeVm> {
    const map = new Map<number, TraineeVm>();
    for (const trainee of trainees) {
        map.set(trainee.rowIndex, trainee);
    }
    return map;
}

/**
 * Builds the rich-text style dictionary for the Y-axis label.
 *
 * Two static base styles are always present:
 *
 *  - `name` — default body style for the trainee display name.
 *  - `pin` — Material Icons font style for the gold favourite pin.
 *
 * Per row, one `avatar${rowIndex}` style is registered with the
 * trainee's avatar data URL as the tile background image. ECharts
 * renders the tile as a fixed-size box, so a `borderRadius` of half
 * the side length yields a perfect circle. Rows whose `avatarDataUrl`
 * is empty (synthetic fallback users) skip the avatar style entirely
 * — the formatter detects this and omits the `{avatar${i}|}` token to
 * avoid a broken-image tile.
 *
 * Favourited rows additionally register a `name${rowIndex}` style with
 * a bolded gold variant of the base name style. The formatter routes
 * favourited rows to this style token.
 *
 * @param trainees - Ordered trainee list. May be empty.
 * @param colors - Resolved theme colours for the base label text.
 * @returns A rich-text style dictionary keyed by token name. Empty
 *          object when the trainee list is empty — the formatter
 *          short-circuits to `''` in that branch.
 */
function buildRichTextStyles(
    trainees: readonly TraineeVm[],
    colors: ChartPalette,
): Record<string, unknown> {
    if (trainees.length === 0) {
        return {};
    }

    const styles: Record<string, unknown> = {
        name: {
            fontSize: 12,
            color: colors.text,
            padding: [0, 4, 0, 0],
            align: 'right',
            verticalAlign: 'middle',
        },
        pin: {
            fontFamily: 'Material Icons',
            fontSize: 14,
            color: FAVOURITE_ACCENT_COLOR,
            padding: [0, 2, 0, 0],
            align: 'right',
            verticalAlign: 'middle',
        },
    };

    for (const trainee of trainees) {
        if (trainee.avatarDataUrl !== '') {
            styles[`avatar${trainee.rowIndex}`] = {
                height: AVATAR_SIZE,
                width: AVATAR_SIZE,
                borderRadius: AVATAR_SIZE / 2,
                verticalAlign: 'middle',
                backgroundColor: {
                    image: normaliseAvatarDataUrl(trainee.avatarDataUrl),
                },
            };
        }

        if (trainee.isFavourited) {
            styles[`name${trainee.rowIndex}`] = {
                fontSize: 12,
                color: FAVOURITE_ACCENT_COLOR,
                fontWeight: 'bold',
                padding: [0, 4, 0, 0],
                align: 'right',
                verticalAlign: 'middle',
            };
        }
    }

    return styles;
}

/**
 * Builds the rich-text formatter closure for the Y-axis label.
 *
 * The closure captures the row-index lookup map and emits a rich-text
 * template string per category. Composition rules:
 *
 *  - Unknown row index (lookup miss) → empty string, which renders as
 *    a blank label.
 *  - Favourited trainee → `{pin|<glyph>}{name${i}|<displayName>}` plus
 *    `{avatar${i}|}` when an avatar is available.
 *  - Normal trainee → `{name|<displayName>}` plus `{avatar${i}|}` when
 *    an avatar is available.
 *
 * Avatar fallback: when the trainee has no avatar data URL (synthetic
 * fallback user — see `BarRow.user` contract), the formatter omits the
 * avatar token entirely. This produces a name-only label in lieu of a
 * broken-image tile — the simplest of the documented fallbacks.
 *
 * @param traineeByRowIndex - Lookup map built from the trainee list.
 * @returns A function suitable for `axisLabel.formatter`.
 */
function buildLabelFormatter(
    traineeByRowIndex: ReadonlyMap<number, TraineeVm>,
): (value: string) => string {
    return (value: string): string => {
        const rowIndex = Number.parseInt(value, 10);
        if (!Number.isFinite(rowIndex)) {
            return '';
        }

        const trainee = traineeByRowIndex.get(rowIndex);
        if (trainee === undefined) {
            return '';
        }

        const hasAvatar = trainee.avatarDataUrl !== '';
        const avatarToken = hasAvatar ? `{avatar${rowIndex}|}` : '';
        const escapedName = escapeRichText(trainee.displayName);

        if (trainee.isFavourited) {
            return `{pin|${FAVOURITE_PIN_CODEPOINT}}{name${rowIndex}|${escapedName}}${avatarToken}`;
        }

        return `{name|${escapedName}}${avatarToken}`;
    };
}

/**
 * Prepends the PNG data-URL prefix when the inbound avatar payload is a
 * bare base64 string. The view-model contract notes that avatars may
 * arrive either fully-qualified (`data:image/png;base64,...`) or as a
 * raw base64 body — ECharts only accepts the fully-qualified form when
 * resolving `backgroundColor.image`.
 *
 * @param raw - The trainee's avatar data URL or bare base64 body.
 * @returns A fully-qualified `data:image/...` URL.
 */
function normaliseAvatarDataUrl(raw: string): string {
    if (raw.startsWith('data:')) {
        return raw;
    }
    return `data:image/png;base64,${raw}`;
}

/**
 * Escapes characters that would otherwise break the ECharts rich-text
 * mini-syntax. Rich text uses `{` and `}` as style-token delimiters and
 * `|` as the style-name/content separator. A trainee display name
 * containing any of these characters would corrupt the template; the
 * documented escape is unicode full-width substitution, but ECharts
 * also accepts a backslash escape — the conservative pick is to strip
 * them entirely. Trainees with these characters are vanishingly rare
 * in practice, and a clean fallback beats a corrupted label.
 *
 * @param text - The raw display-name text.
 * @returns The same text with rich-text control characters removed.
 */
function escapeRichText(text: string): string {
    return text.replace(/[{}|]/g, '');
}
