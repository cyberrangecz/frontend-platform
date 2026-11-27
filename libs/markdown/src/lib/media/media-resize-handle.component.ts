import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, output, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MediaSizeLimits } from './media-size-limits';
import { moveSessionTo, ResizeSession, startSession, widthAfterKey, widthAfterPointer } from './resize-session';

/**
 * Corner handle that sets the display width of a media card with its aspect ratio locked. A
 * pointer drag, whose two axes both count along the card's aspect ratio, or the arrow keys change
 * the width within the card's limits, reporting each width as a preview; releasing the pointer,
 * Enter or leaving the handle reports the final width, and Escape drops the change. Home and End
 * jump to the limits. The slider's value and range are announced in whole px at all times.
 */
@Component({
    selector: 'crczp-media-resize-handle',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIconModule],
    templateUrl: './media-resize-handle.component.html',
    styleUrl: './media-resize-handle.component.scss',
    host: {
        role: 'slider',
        tabindex: '0',
        'aria-label': 'Resize',
        'aria-orientation': 'horizontal',
        '[class.resize-handle--active]': 'session() !== null',
        '[attr.aria-valuemin]': 'announcedMinimum()',
        '[attr.aria-valuemax]': 'announcedMaximum()',
        '[attr.aria-valuenow]': 'announcedWidth()',
        '[attr.aria-valuetext]': 'valueText()',
        'aria-keyshortcuts': 'ArrowLeft ArrowRight ArrowUp ArrowDown Home End Enter Escape',
        '(pointerdown)': 'onPointerDown($event)',
        '(pointermove)': 'onPointerMove($event)',
        '(pointerup)': 'onPointerUp($event)',
        '(pointercancel)': 'onPointerCancel($event)',
        '(keydown)': 'onKeydown($event)',
        '(focus)': 'begin()',
        '(blur)': 'commit()',
    },
})
export class MediaResizeHandleComponent {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    /** Reads the width the card is shown at now. */
    readonly currentWidth = input.required<() => number>();
    /** The limits the card may be resized within; null while they are not known. */
    readonly limits = input<MediaSizeLimits | null>(null);

    /** The width the card is shown at while no resize is in progress, in whole px; null while unknown. */
    readonly shownWidth = input<number | null>(null);
    /** How tall the card is per unit of its width, which maps a pointer's vertical movement onto the width; 0 ignores that movement. */
    readonly heightPerWidth = input(0);

    /** A width reached while resizing, or null once the resize has ended, whether or not it changed the width. */
    readonly preview = output<number | null>();
    /** The width a resize ended at, when it differs from the width the resize started at. */
    readonly resized = output<number>();

    protected readonly session = signal<ResizeSession | null>(null);
    protected readonly valueText = computed(() => {
        const session = this.session();
        return session ? `${session.current} px` : null;
    });
    private readonly announcedLimits = computed(() => this.session()?.limits ?? this.limits());
    protected readonly announcedMinimum = computed(() => this.announcedLimits()?.minimum ?? null);
    protected readonly announcedMaximum = computed(() => {
        const maximum = this.announcedLimits()?.maximum;
        return maximum !== undefined && Number.isFinite(maximum) ? maximum : null;
    });
    protected readonly announcedWidth = computed(() => this.session()?.current ?? this.shownWidth());

    private pointerStartX = 0;
    private pointerStartY = 0;
    private pointerId: number | null = null;

    protected begin(): void {
        if (this.session()) {
            return;
        }
        const limits = this.limits();
        if (limits) {
            this.session.set(startSession(this.currentWidth()(), limits));
        }
    }

    protected onPointerDown(event: PointerEvent): void {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        this.begin();
        if (this.session()) {
            this.pointerStartX = event.clientX;
            this.pointerStartY = event.clientY;
            this.pointerId = event.pointerId;
            this.host.setPointerCapture(event.pointerId);
        }
    }

    protected onPointerMove(event: PointerEvent): void {
        const session = this.session();
        if (session && event.pointerId === this.pointerId) {
            const deltaX = event.clientX - this.pointerStartX;
            const deltaY = event.clientY - this.pointerStartY;
            this.moveTo(session, widthAfterPointer(session, deltaX, deltaY, this.heightPerWidth()));
        }
    }

    protected onPointerUp(event: PointerEvent): void {
        if (event.pointerId === this.pointerId) {
            this.pointerId = null;
            this.commit();
        }
    }

    protected onPointerCancel(event: PointerEvent): void {
        if (event.pointerId === this.pointerId) {
            this.cancel();
        }
    }

    protected onKeydown(event: KeyboardEvent): void {
        this.begin();
        const session = this.session();
        if (!session) {
            return;
        }
        switch (event.key) {
            case 'Enter':
                this.commit();
                break;
            case 'Escape':
                this.cancel();
                break;
            default: {
                const width = widthAfterKey(session, event.key, event.shiftKey);
                if (width === null) {
                    return;
                }
                this.moveTo(session, width);
            }
        }
        event.preventDefault();
        event.stopPropagation();
    }

    private cancel(): void {
        if (this.session()) {
            this.session.set(null);
            this.pointerId = null;
            this.preview.emit(null);
        }
    }

    protected commit(): void {
        const session = this.session();
        if (!session) {
            return;
        }
        this.session.set(null);
        this.preview.emit(null);
        if (session.current !== session.start) {
            this.resized.emit(session.current);
        }
    }

    private moveTo(session: ResizeSession, width: number): void {
        const moved = moveSessionTo(session, width);
        this.session.set(moved);
        this.preview.emit(moved.current);
    }
}
