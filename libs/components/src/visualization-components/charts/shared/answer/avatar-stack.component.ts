import { NgTemplateOutlet } from '@angular/common';
import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    effect,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map, of, Subject, switchMap, timer } from 'rxjs';
import { avatarDataUrl, nameInitial } from '../trainee/avatar-identity';
import { PALETTE } from '../theme/event-type-colors';
import { AvatarFace, DEFAULT_AVATAR_CAP, FaceEmphasis } from './answer-tokens';

/** Delay before the hover card closes, bridging the pointer's move from row to card. */
const CLOSE_DELAY_MS = 80;

/** Card inner padding in pixels, matching the 0.5rem SCSS padding at the root font size; the overlay offset cancels it so the grid aligns to the row. */
const CARD_PADDING_PX = 8;

/** Rendered diameter of one avatar face in pixels, matching the 1.5rem SCSS face size at the root font size. */
const FACE_SIZE_PX = 24;

/** Horizontal advance each face after the first adds to the row, matching the SCSS overlap of 0.4 of a face. */
const FACE_STEP_PX = FACE_SIZE_PX * 0.6;

/**
 * Largest number of overlapped faces that fit a row of the given width, reserving one
 * face slot for the overflow toggle whenever the faces do not all fit.
 *
 * @param width Available row width in pixels; zero or less before the first measurement.
 * @param total Number of faces available to show.
 * @returns The face count to show at rest, from zero up to total.
 */
function fittingFaceCount(width: number, total: number): number {
    if (total === 0) return 0;
    if (width <= 0) return Math.min(total, DEFAULT_AVATAR_CAP);
    if (FACE_SIZE_PX + (total - 1) * FACE_STEP_PX <= width) return total;
    const fit = Math.floor((width - FACE_STEP_PX - FACE_SIZE_PX) / FACE_STEP_PX) + 1;
    return Math.max(1, Math.min(total, fit));
}

/** One avatar prepared for rendering: identity plus a resolved picture source. */
interface RenderFace {
    /** Training run identifier emitted when the face is clicked. */
    readonly runId: number;
    /** Trainee display name, used for the tooltip and the no-picture initial. */
    readonly name: string;
    /** Ring emphasis drawn around this face. */
    readonly emphasis: FaceEmphasis;
    /** Data-URL form of the avatar picture, or null when none is available. */
    readonly src: string | null;
    /** Uppercase leading character shown when no picture is available. */
    readonly initial: string;
}

/**
 * Overlapping row of trainee avatars representing who chose an answer. At rest it
 * shows as many faces as fit its measured width with a trailing overflow toggle; when
 * more faces exist than fit, hovering, focusing, or activating the toggle opens a card
 * anchored to the row that lays every face out in a scrollable five-by-five grid. An emphasised face
 * carries a ring — gold for the focused trainee, blue for an answer's choosers — and
 * clicking any face emits that trainee's run id.
 */
@Component({
    selector: 'crczp-avatar-stack',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgTemplateOutlet, OverlayModule, MatTooltipModule],
    templateUrl: './avatar-stack.component.html',
    styleUrl: './avatar-stack.component.scss',
})
export class AvatarStackComponent {
    /** Ring colour drawn around the focused trainee's face. */
    protected readonly traineeRingColor = PALETTE.gold.color;

    /** Ring colour drawn around the faces of an answer's choosers. */
    protected readonly answerRingColor = PALETTE.blue.color;

    /** Faces to render, in display order. */
    readonly faces = input.required<readonly AvatarFace[]>();

    /** Emits the training run id of a clicked face. */
    readonly faceClick = output<number>();

    private readonly hostElement = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly destroyRef = inject(DestroyRef);

    /** Measured content width of the host row in pixels, zero until first laid out. */
    private readonly rowWidth = signal<number>(0);

    /** Overflow toggle button, focused again once the card closes via keyboard. */
    private readonly overflowToggle = viewChild<ElementRef<HTMLButtonElement>>('overflowToggle');

    /** Hover card element, whose first face receives focus once opened via the toggle. */
    private readonly card = viewChild<ElementRef<HTMLElement>>('card');

    /** Faces prepared for the template, emphasized ones first so they lead the row and survive truncation. */
    protected readonly renderFaces = computed<readonly RenderFace[]>(() =>
        this.faces()
            .map((face) => {
                const name = face.name.trim();
                return {
                    runId: face.runId,
                    name,
                    emphasis: face.emphasis,
                    src: avatarDataUrl(face.picture),
                    initial: nameInitial(name),
                };
            })
            .sort((first, second) => Number(second.emphasis !== 'none') - Number(first.emphasis !== 'none')),
    );

    /** Faces that fit the measured row width, before the overflow toggle is needed. */
    protected readonly restingCap = computed<number>(() => fittingFaceCount(this.rowWidth(), this.faces().length));

    /** The set of faces shown in the resting row, sized to the available width. */
    protected readonly restingFaces = computed<readonly RenderFace[]>(() => this.renderFaces().slice(0, this.restingCap()));

    /** Number of faces hidden behind the overflow toggle at rest. */
    protected readonly overflowCount = computed<number>(() => Math.max(0, this.faces().length - this.restingCap()));

    /** Whether more faces exist than the resting row shows, enabling the hover card. */
    protected readonly hasOverflow = computed<boolean>(() => this.overflowCount() > 0);

    /** Open state driven by pointer hover and keyboard focus, debounced on close. */
    private readonly hoverOpen = signal<boolean>(false);

    /** Open state pinned by activating the overflow toggle, for touch and keyboard use. */
    private readonly pinnedOpen = signal<boolean>(false);

    /** Whether the hover card is currently open. */
    protected readonly isOpen = computed<boolean>(() => this.hasOverflow() && (this.hoverOpen() || this.pinnedOpen()));

    /** Fallback overlay positions so the card flips to whichever corner fits the viewport. */
    protected readonly overlayPositions: readonly ConnectedPosition[] = [
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'top', offsetX: -CARD_PADDING_PX, offsetY: -CARD_PADDING_PX },
        { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'top', offsetX: CARD_PADDING_PX, offsetY: -CARD_PADDING_PX },
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'bottom', offsetX: -CARD_PADDING_PX, offsetY: CARD_PADDING_PX },
        { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'bottom', offsetX: CARD_PADDING_PX, offsetY: CARD_PADDING_PX },
    ];

    /** Hover/focus intent from the row and the card: true opens at once, false closes after a delay. */
    private readonly hoverIntent = new Subject<boolean>();

    constructor() {
        this.hoverIntent
            .pipe(
                switchMap((wantOpen) => (wantOpen ? of(true) : timer(CLOSE_DELAY_MS).pipe(map(() => false)))),
                takeUntilDestroyed(),
            )
            .subscribe((open) => this.hoverOpen.set(open));

        effect(() => {
            if (this.isOpen() && this.pinnedOpen()) {
                this.card()?.nativeElement.querySelector<HTMLButtonElement>('button')?.focus();
            }
        });

        afterNextRender(() => this.observeWidth(this.hostElement.nativeElement));
    }

    /**
     * Mirrors the host's content width into {@link rowWidth}. The observer fires once on
     * registration, capturing the initial width, and is disconnected on destroy.
     *
     * @param host The component host element whose width to track.
     */
    private observeWidth(host: HTMLElement): void {
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) this.rowWidth.set(entry.contentRect.width);
        });
        observer.observe(host);
        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    /**
     * Emits the clicked face's training run id and dismisses the hover card at once, so the card
     * does not linger and re-sort the selected face under the pointer before it closes.
     *
     * @param runId Training run id of the clicked face.
     */
    protected onFaceClick(runId: number): void {
        this.faceClick.emit(runId);
        this.hoverOpen.set(false);
        this.pinnedOpen.set(false);
    }

    /** Signals hover or focus entry on the row or the card, opening the hover card. */
    protected onHoverStart(): void {
        this.hoverIntent.next(true);
    }

    /** Signals hover or focus exit from the row or the card, closing the hover card after a short delay. */
    protected onHoverEnd(): void {
        this.hoverIntent.next(false);
    }

    /** Toggles the pinned-open state from the overflow button, for touch and keyboard activation. */
    protected onOverflowToggle(): void {
        this.pinnedOpen.update((open) => !open);
    }

    /** Closes the card on Escape and returns focus to the overflow toggle. */
    protected onCardClose(): void {
        this.pinnedOpen.set(false);
        this.hoverOpen.set(false);
        this.overflowToggle()?.nativeElement.focus();
    }
}
