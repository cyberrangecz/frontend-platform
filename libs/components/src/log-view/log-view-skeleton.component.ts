import {
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { takeWhile, timer } from 'rxjs';
import { LogoSpinnerComponent } from '../logo-spinner/logo-spinner.component';
import { NgxSkeletonLoaderComponent, NgxSkeletonLoaderConfigTheme } from 'ngx-skeleton-loader';
import { LOG_LINE_HEIGHT } from './crczp-editor-theme';
import { LogSkeletonRow } from './log-view-skeleton-samples';

/** Rows the tallest log viewport can show at once. */
const VISIBLE_ROW_CAPACITY = 128;

/** Time loading must last before the skeleton appears. */
export const SKELETON_SHOW_DELAY_MS = 300;

/** Time between two rows joining the build-up. */
export const SKELETON_BUILD_STEP_MS = 120;

/** Space above the first row, in pixels. */
const CONTENT_PADDING_TOP_PX = 8;

/** How a row of the strip is drawn. */
type SkeletonRowStatus = 'settled' | 'growing' | 'pending';

/** One rendered row of the skeleton strip. */
interface SkeletonStripRow {
    /** Characters before the row's rectangle. */
    readonly indent: number;
    /** Styles of the row's rectangle; null for a blank row. */
    readonly rectangle: NgxSkeletonLoaderConfigTheme | null;
    /** Whether the row is hidden, growing in or at rest. */
    readonly status: SkeletonRowStatus;
}

function rectangleTheme(width: number): NgxSkeletonLoaderConfigTheme {
    return {
        width: `${width}ch`,
        height: '0.5lh',
        margin: '0',
        display: 'block',
        'border-radius': '4px',
        '--ngx-skeleton-loader-base-color':
            'color-mix(in srgb, var(--log-foreground) 12%, var(--log-background))',
        '--ngx-skeleton-loader-light-mode-color':
            'color-mix(in srgb, var(--log-background) 60%, transparent)',
    };
}

/**
 * Placeholder of a downloading log. It stays invisible for a show delay, then builds up
 * row by row from the top, each row growing in from left to right, until the log area is
 * filled. It then loops: the sample's row shapes tiled into one endless strip that scrolls
 * up one row at a time, the incoming bottom row growing in from left to right. A loading
 * notice with a spinner fades in at the top right together with the first row.
 */
@Component({
    selector: 'crczp-log-view-skeleton',
    imports: [LogoSpinnerComponent, NgxSkeletonLoaderComponent],
    templateUrl: './log-view-skeleton.component.html',
    styleUrl: './log-view-skeleton.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        'aria-hidden': 'true',
        '[style.line-height]': 'lineHeight',
        '[style.--skeleton-sample-rows]': 'sample().length',
        '[style.--skeleton-widest-row]': 'widestRow()',
        '[style.--skeleton-content-padding-top]': 'contentPaddingTop',
        '[class.skeleton-waiting]': 'phase() === "waiting"',
        '[class.skeleton-looping]': 'phase() === "looping"',
    },
})
export class LogViewSkeleton {
    /** Row shapes repeated end to end; at least one row. */
    readonly sample = input.required<readonly LogSkeletonRow[]>();

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly viewportRows = signal(0);
    private readonly builtRows = signal(0);

    protected readonly phase = computed(() => {
        if (this.builtRows() === 0) return 'waiting';
        return this.builtRows() >= this.viewportRows() ? 'looping' : 'building';
    });

    /** Sample copies filling the viewport plus one sample of rows waiting below it. */
    protected readonly rows = computed<readonly SkeletonStripRow[]>(() => {
        const sampleRows = this.sample().map(({ indent, width }) => ({
            indent,
            rectangle: width > 0 ? rectangleTheme(width) : null,
        }));
        const copies = Math.ceil(VISIBLE_ROW_CAPACITY / sampleRows.length) + 1;
        const firstViewportRow = (copies - 1) * sampleRows.length - this.viewportRows();
        return Array.from({ length: copies }, () => sampleRows)
            .flat()
            .map((row, index) => ({
                ...row,
                status: this.rowStatus(index - firstViewportRow),
            }));
    });
    protected readonly widestRow = computed(() =>
        Math.max(...this.sample().map(({ indent, width }) => indent + width)),
    );
    protected readonly lineHeight = LOG_LINE_HEIGHT;
    protected readonly contentPaddingTop = `${CONTENT_PADDING_TOP_PX}px`;

    constructor() {
        timer(SKELETON_SHOW_DELAY_MS, SKELETON_BUILD_STEP_MS)
            .pipe(
                takeWhile(() => this.phase() !== 'looping'),
                takeUntilDestroyed(),
            )
            .subscribe((tick) => (tick === 0 ? this.startBuildUp() : this.builtRows.update((rows) => rows + 1)));
    }

    private startBuildUp(): void {
        const rowHeight = parseFloat(getComputedStyle(this.host).lineHeight);
        const fittingRows = Math.ceil((this.host.clientHeight - CONTENT_PADDING_TOP_PX) / rowHeight);
        this.viewportRows.set(Math.min(Math.max(fittingRows, 1), VISIBLE_ROW_CAPACITY));
        this.builtRows.set(
            matchMedia('(prefers-reduced-motion: reduce)').matches ? this.viewportRows() : 1,
        );
    }

    private rowStatus(rowsFromViewportTop: number): SkeletonRowStatus {
        if (this.phase() !== 'building' || rowsFromViewportTop < 0) return 'settled';
        return rowsFromViewportTop < this.builtRows() ? 'growing' : 'pending';
    }
}
