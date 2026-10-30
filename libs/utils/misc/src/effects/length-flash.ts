import { Renderer2, RendererStyleFlags2 } from '@angular/core';

/** How long the flash stays at full strength, arriving on the keystroke itself. */
const FLASH_HOLD_MILLISECONDS = 200;

/** How long the flash takes to leave once the hold is spent. */
const FLASH_FADE_MILLISECONDS = 100;

/**
 * Rate the flash leaves at, cubic and starting from rest so the hold runs into the
 * fade with no break in speed to mark where one ends.
 */
const FLASH_FADE_EASING = 'cubic-bezier(0.32, 0, 0.67, 0)';

/** Colour a refused keystroke is shown in. */
const FLASH_COLOR =
    'var(--mat-form-field-outlined-error-outline-color, #ba1a1a)';

/** How much heavier text is set while the flash stands on it. */
const FLASH_WEIGHT_GAIN = 200;

/** Heaviest a bump may reach, past which a face has nothing left to give. */
const HEAVIEST_FONT_WEIGHT = 900;

/** A style the flash writes, or how to read one from the element it is written onto. */
type FlashValue = string | ((element: HTMLElement) => string);

/** The weight the element is set at, gained on and held within what a face carries. */
const heavier: FlashValue = (element) =>
    String(
        Math.min(
            HEAVIEST_FONT_WEIGHT,
            Number(getComputedStyle(element).fontWeight) + FLASH_WEIGHT_GAIN,
        ),
    );

/**
 * Colours an outline is read from, one per state the surface may be sitting in when
 * the keystroke lands, so the flash is owed to it in all of them.
 */
const OUTLINE_COLOR_FLASH: Readonly<Record<string, FlashValue>> = {
    '--mat-form-field-outlined-outline-color': FLASH_COLOR,
    '--mat-form-field-outlined-hover-outline-color': FLASH_COLOR,
    '--mat-form-field-outlined-focus-outline-color': FLASH_COLOR,
};

/**
 * What a Material field is held at: the colours, and a thickness a pixel over each one
 * it stands in for. The outline is drawn inside a box of its own, so the pixel is
 * gained inward and nothing around the field moves.
 */
const FIELD_FLASH: Readonly<Record<string, FlashValue>> = {
    ...OUTLINE_COLOR_FLASH,
    '--mat-form-field-outlined-outline-width': '2px',
    '--mat-form-field-outlined-focus-outline-width': '3px',
};

/**
 * What the text under a field is held at. It is where the count of what is written
 * stands, so it is the line a refusal is read on, and it is set heavier for as long as
 * the flash holds rather than thickening the letters for good.
 */
const TEXT_FLASH: Readonly<Record<string, FlashValue>> = {
    color: FLASH_COLOR,
    'font-weight': heavier,
};

/** What the text under a field moves through, both being read off the element. */
const TEXT_EASED = ['color', 'font-weight'] as const;

/** What a host drawing no outline of its own is ringed with instead. */
const RING_FLASH: Readonly<Record<string, FlashValue>> = {
    'box-shadow': `0 0 0 2px ${FLASH_COLOR}`,
};

/**
 * Surfaces a flash can be shown on, tried in turn, each a set of parts. A part states
 * where the flash is written — the carrier itself where it names nothing — the elements
 * drawing what it changes, and what those move through on the way back. A colour the
 * surface already reads from is lent rather than drawn over, so the flash inherits the
 * outline's shape, its thickness and every break in it without restating any of them.
 */
const FLASH_SURFACES: readonly FlashSurfaceSpec[] = [
    {
        carrier: 'mat-form-field',
        parts: [
            {
                written: null,
                drawn: '.mat-mdc-notch-piece',
                eased: ['border-color', 'border-width'],
                styles: FIELD_FLASH,
            },
            {
                written: '.mat-mdc-form-field-hint',
                drawn: null,
                eased: TEXT_EASED,
                styles: TEXT_FLASH,
            },
        ],
    },
    {
        carrier: 'sentinel-markdown-editor',
        parts: [
            {
                written: null,
                drawn: '.mrkdwn-editor',
                eased: ['outline-color'],
                styles: OUTLINE_COLOR_FLASH,
            },
        ],
    },
];

/** One part of a surface as declared: the selectors it acts on, where the carrier stands in for a null selector. */
type FlashPartSpec = {
    written: string | null;
    drawn: string | null;
    eased: readonly string[];
    styles: Readonly<Record<string, FlashValue>>;
};

/** A host ancestor the flash is looked up on, with the parts drawn within it. */
type FlashSurfaceSpec = {
    carrier: string;
    parts: readonly FlashPartSpec[];
};

/** One part of a surface, resolved to the elements it acts on. */
type FlashPart = {
    written: HTMLElement[];
    drawn: HTMLElement[];
    eased: readonly string[];
    styles: Readonly<Record<string, FlashValue>>;
};

/** How what is drawn moves while a flash is on it, or nothing where it is over. */
type FlashMotion = 'none' | 'fade' | null;

/** The elements a selector reaches within the element it is read from. */
function select(root: HTMLElement, selector: string): HTMLElement[] {
    return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

/**
 * Shows a refusal on whatever the surface around an element already draws its own
 * outline and subscript with, red cutting in at once, standing through a hold and
 * easing away. Which surface that is it settles for itself, so a caller shows a
 * refusal and states nothing about where it lands.
 */
export class LengthFlash {
    private pending: ReturnType<typeof setTimeout> | null = null;

    constructor(
        private readonly host: HTMLElement,
        private readonly renderer: Renderer2,
    ) {}

    /**
     * Lends the surface the flash and takes it back. A flash still standing is stopped
     * and taken back first, so what the next one is measured against is the surface at
     * rest rather than the one before it part way through.
     *
     * @param alongside Text flashed with the surface, where it stands outside one.
     */
    show(alongside: readonly HTMLElement[] = []): void {
        const parts = this.resolveParts();
        if (alongside.length > 0) {
            parts.push({
                written: [...alongside],
                drawn: [...alongside],
                eased: TEXT_EASED,
                styles: TEXT_FLASH,
            });
        }

        this.ease(parts, 'none');
        this.erase(parts);
        this.write(parts);

        this.schedule(FLASH_HOLD_MILLISECONDS, () => {
            this.ease(parts, 'fade');
            this.erase(parts);
            this.schedule(FLASH_FADE_MILLISECONDS, () =>
                this.ease(parts, null),
            );
        });
    }

    /** Drops whatever step is due, the surface being about to go. */
    stop(): void {
        if (this.pending !== null) {
            clearTimeout(this.pending);
            this.pending = null;
        }
    }

    /**
     * The parts of the nearest surface the host stands on, falling back to the host
     * itself, which is ringed directly for want of an outline of its own to be lent.
     */
    private resolveParts(): FlashPart[] {
        for (const surface of FLASH_SURFACES) {
            const carrier = this.host.closest<HTMLElement>(surface.carrier);
            if (carrier === null) {
                continue;
            }

            return surface.parts.map((part) => {
                const written =
                    part.written === null
                        ? [carrier]
                        : select(carrier, part.written);
                return {
                    written,
                    drawn:
                        part.drawn === null
                            ? written
                            : select(carrier, part.drawn),
                    eased: part.eased,
                    styles: part.styles,
                };
            });
        }

        return [
            {
                written: [this.host],
                drawn: [this.host],
                eased: ['box-shadow'],
                styles: RING_FLASH,
            },
        ];
    }

    /** Writes the flash, each value read from the element it is written onto. */
    private write(parts: FlashPart[]): void {
        for (const part of parts) {
            for (const element of part.written) {
                for (const [property, value] of Object.entries(part.styles)) {
                    this.renderer.setStyle(
                        element,
                        property,
                        typeof value === 'function' ? value(element) : value,
                        RendererStyleFlags2.DashCase,
                    );
                }
            }
        }
    }

    /** Takes the flash back, leaving the surface stating nothing of its own. */
    private erase(parts: FlashPart[]): void {
        for (const part of parts) {
            for (const element of part.written) {
                for (const property of Object.keys(part.styles)) {
                    this.renderer.removeStyle(
                        element,
                        property,
                        RendererStyleFlags2.DashCase,
                    );
                }
            }
        }
    }

    /**
     * States how what is drawn moves, or gives that statement back once the flash is
     * over, so the surface keeps whatever motion it had before one.
     */
    private ease(parts: FlashPart[], motion: FlashMotion): void {
        for (const part of parts) {
            const transition =
                motion === 'fade'
                    ? part.eased
                          .map(
                              (property) =>
                                  `${property} ${FLASH_FADE_MILLISECONDS}ms ${FLASH_FADE_EASING}`,
                          )
                          .join(', ')
                    : motion;

            for (const element of part.drawn) {
                if (transition === null) {
                    this.renderer.removeStyle(element, 'transition');
                } else {
                    this.renderer.setStyle(element, 'transition', transition);
                }
            }
        }
    }

    /** Runs the flash's next step, a fresh keystroke dropping whichever step is due. */
    private schedule(delay: number, step: () => void): void {
        this.stop();
        this.pending = setTimeout(() => {
            this.pending = null;
            step();
        }, delay);
    }
}
