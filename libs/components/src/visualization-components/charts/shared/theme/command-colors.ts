import { CategoricalColorPair, Utils } from '@crczp/utils';

import {
    CURATED_COMMAND_HUES,
    MAIN_CHROMA_SCALE,
    RESERVED_HUE_RADIUS_DEGREES,
    SECONDARY_CHROMA_SCALE,
    SLOT_SPACING_DEGREES,
} from './command-color.config';

/** A half-open hue interval `[start, end)` in degrees, never wrapping past 360. */
interface HueArc {
    /** Inclusive start of the interval, in degrees. */
    readonly start: number;
    /** Exclusive end of the interval, in degrees. */
    readonly end: number;
}

/** A discrete generated-colour slot: a hue at a given saturation plane. */
interface ColorSlot {
    /** Hue of the slot, in degrees. */
    readonly hue: number;
    /** Chroma multiplier identifying the slot's saturation plane. */
    readonly chromaScale: number;
}

/**
 * Normalises a hue to the `[0, 360)` range.
 *
 * @param hueDegrees Hue angle in degrees.
 * @returns          The equivalent hue in `[0, 360)`.
 */
function normalizeHue(hueDegrees: number): number {
    return ((hueDegrees % 360) + 360) % 360;
}

/**
 * Computes the 32-bit FNV-1a hash of a string.
 *
 * @param value String to hash.
 * @returns      Unsigned 32-bit hash value.
 */
function hashString(value: string): number {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index++) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
}

/**
 * Expands each curated hue into a reserved band of the given radius, splitting any
 * band that crosses 0/360, then merges overlapping bands into a sorted list.
 *
 * @param hues   Curated hues in degrees.
 * @param radius Half-width of the band around each hue, in degrees.
 * @returns      Sorted, non-overlapping reserved intervals within `[0, 360)`.
 */
function buildReservedBands(hues: readonly number[], radius: number): HueArc[] {
    const bands: HueArc[] = [];
    for (const hue of hues) {
        const center = normalizeHue(hue);
        const start = center - radius;
        const end = center + radius;
        if (start < 0) {
            bands.push({ start: start + 360, end: 360 }, { start: 0, end });
        } else if (end > 360) {
            bands.push({ start, end: 360 }, { start: 0, end: end - 360 });
        } else {
            bands.push({ start, end });
        }
    }

    bands.sort((first, second) => first.start - second.start);

    const merged: HueArc[] = [];
    for (const band of bands) {
        const last = merged[merged.length - 1];
        if (last !== undefined && band.start <= last.end) {
            if (band.end > last.end) {
                merged[merged.length - 1] = { start: last.start, end: band.end };
            }
        } else {
            merged.push(band);
        }
    }
    return merged;
}

/**
 * Computes the complement of the reserved bands within `[0, 360)` — the main-plane
 * arcs free of any curated reservation.
 *
 * @param reserved Sorted, non-overlapping reserved intervals.
 * @returns        The free hue arcs, in ascending order.
 */
function buildAllowedArcs(reserved: readonly HueArc[]): HueArc[] {
    const allowed: HueArc[] = [];
    let cursor = 0;
    for (const band of reserved) {
        if (band.start > cursor) {
            allowed.push({ start: cursor, end: band.start });
        }
        cursor = Math.max(cursor, band.end);
    }
    if (cursor < 360) {
        allowed.push({ start: cursor, end: 360 });
    }
    return allowed;
}

/**
 * Builds the generated-colour slot space across two saturation planes: the free
 * main-plane arcs (full saturation, between curated reservations) followed by the
 * full secondary plane (lower saturation). Slots within a plane are spaced by
 * {@link SLOT_SPACING_DEGREES}.
 *
 * @returns The ordered slot space.
 */
function buildColorSlots(): ColorSlot[] {
    const curatedHues = Object.values(CURATED_COMMAND_HUES);
    const reserved = buildReservedBands(curatedHues, RESERVED_HUE_RADIUS_DEGREES);
    const allowed = buildAllowedArcs(reserved);

    const slots: ColorSlot[] = [];
    for (const arc of allowed) {
        for (let hue = arc.start; hue < arc.end; hue += SLOT_SPACING_DEGREES) {
            slots.push({ hue, chromaScale: MAIN_CHROMA_SCALE });
        }
    }
    for (let hue = 0; hue < 360; hue += SLOT_SPACING_DEGREES) {
        slots.push({ hue, chromaScale: SECONDARY_CHROMA_SCALE });
    }
    return slots;
}

const COLOR_SLOTS = buildColorSlots();

/**
 * Assigns generated commands to distinct colour slots by open addressing: a command
 * starts at its hashed slot and probes forward to the next free one, so two commands
 * never share a colour until the slot space is exhausted. Assignments are memoized,
 * keeping a command's colour stable for the lifetime of the session and shared across
 * every chart.
 */
class CommandColorAllocator {
    private readonly used = new Set<number>();
    private readonly assigned = new Map<string, number>();

    /**
     * Resolves the slot for a command, allocating and memoizing one on first request.
     *
     * @param commandKey Normalised command name.
     * @returns          The command's colour slot.
     */
    resolve(commandKey: string): ColorSlot {
        return COLOR_SLOTS[this.resolveIndex(commandKey)] ?? { hue: 0, chromaScale: SECONDARY_CHROMA_SCALE };
    }

    /**
     * Resolves the slot index for a command, probing for a free slot on collision.
     *
     * @param commandKey Normalised command name.
     * @returns          Index into {@link COLOR_SLOTS}.
     */
    private resolveIndex(commandKey: string): number {
        const memoized = this.assigned.get(commandKey);
        if (memoized !== undefined) {
            return memoized;
        }

        const slotCount = COLOR_SLOTS.length;
        const start = hashString(commandKey) % slotCount;
        for (let probe = 0; probe < slotCount; probe++) {
            const index = (start + probe) % slotCount;
            if (!this.used.has(index)) {
                this.used.add(index);
                this.assigned.set(commandKey, index);
                return index;
            }
        }

        this.assigned.set(commandKey, start);
        return start;
    }
}

const allocator = new CommandColorAllocator();

/**
 * Resolves the bold/pale colour pair for a command name, consistently across every
 * dashboard chart. Well-known commands render their curated hue at the main
 * saturation; every other command is allocated a distinct slot — a free main-plane
 * hue or a lower-saturation secondary-plane hue — and keeps it for the session, so
 * no two commands ever share a colour while the slot space lasts.
 *
 * @param commandName Command (tool) name to colour.
 * @returns           The colour pair assigned to that command.
 */
export function commandColorPair(commandName: string): CategoricalColorPair {
    const key = commandName.trim().toLowerCase();
    const curatedHue = CURATED_COMMAND_HUES[key];
    if (curatedHue !== undefined) {
        return Utils.Color.pairFromHue(normalizeHue(curatedHue), MAIN_CHROMA_SCALE);
    }
    const slot = allocator.resolve(key);
    return Utils.Color.pairFromHue(slot.hue, slot.chromaScale);
}

/**
 * Resolves the single bold colour for a command name, for charts that render one
 * swatch per command rather than a bold/pale pair.
 *
 * @param commandName Command (tool) name to colour.
 * @returns           The bold colour assigned to that command.
 */
export function commandColor(commandName: string): string {
    return commandColorPair(commandName).dark;
}
