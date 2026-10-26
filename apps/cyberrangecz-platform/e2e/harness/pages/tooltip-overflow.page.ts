import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DomSanitizer } from '@angular/platform-browser';
import type { RichTooltipModel } from '@crczp/components';
import { from } from 'rxjs';
import { map } from 'rxjs/operators';

/** Title long enough to wrap well beyond the clamp ceiling, including an unbreakable token. */
const LONG_TITLE =
    'Level 4 · Initial Access — exploiting an exposed FTP service by brute-forcing perimeter ' +
    'credentials against host-internal-perimeter-gateway-0001.corp.internal.example.lan while ' +
    'narrating every single step of the engagement in a deliberately overlong heading that keeps ' +
    'going far past the point of reason so that it is guaranteed to wrap onto well over five lines ' +
    'at the tooltip width on every browser engine and therefore must be clamped with an ellipsis.';

/** Value long enough to wrap past five lines, with long no-space path tokens that must not overflow horizontally. */
const LONG_VALUE =
    'hydra -L /usr/share/wordlists/seclists/Usernames/top-usernames-shortlist.txt ' +
    '-P /usr/share/wordlists/seclists/Passwords/Leaked-Databases/rockyou-75.txt ftp://10.0.0.1 ' +
    '-t 16 -f -V -W 30 -w 5 -o /root/engagements/2026/internal/results/ftp-bruteforce-attempt-output.log ' +
    '--threads 16 --timeout 30 --retries 5 --verbose --continue-on-error --output-format json';

/** Shared model exercising a long title, a short value, and an overflowing value. */
const TOOLTIP_MODEL: RichTooltipModel = {
    title: LONG_TITLE,
    rows: [
        { label: 'Type', value: 'Training' },
        { label: 'At', value: '38:43 · Jun 22, 08:34:06' },
        { label: '38:43', value: LONG_VALUE },
    ],
};

/**
 * Test-fixture page rendering both rich-tooltip strategies from one shared model: the ECharts
 * `renderRichTooltipHtml` string surface (injected as trusted HTML, exactly as ECharts injects it)
 * and the CDK-overlay {@link RichTooltipComponent}. Playwright drives it to assert long title and
 * value text wraps, clamps to the line ceiling with an ellipsis, and never overflows the surface.
 */
@Component({
    selector: 'crczp-tooltip-overflow',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [NgComponentOutlet],
    template: `
        @if (tooltips(); as loaded) {
            <section data-testid="echarts-tooltip" [innerHTML]="loaded.echartsHtml"></section>
            <section data-testid="dom-tooltip">
                <ng-container *ngComponentOutlet="loaded.component; inputs: { content: model }" />
            </section>
        }
    `,
    styles: [
        `
            :host {
                display: block;
                padding: 2rem;
            }

            [data-testid='dom-tooltip'] {
                margin-top: 2rem;
            }
        `,
    ],
})
export class TooltipOverflowPage {
    /** Shared model also handed to the DOM-overlay tooltip component. */
    protected readonly model = TOOLTIP_MODEL;

    private readonly sanitizer = inject(DomSanitizer);

    /**
     * Both tooltip surfaces, available once the components library has loaded: the ECharts surface
     * as trusted HTML, mirroring how ECharts injects the formatter output, and the DOM-overlay
     * component class.
     */
    protected readonly tooltips = toSignal(
        from(import('@crczp/components')).pipe(
            map((components) => ({
                echartsHtml: this.sanitizer.bypassSecurityTrustHtml(
                    components.renderRichTooltipHtml(TOOLTIP_MODEL),
                ),
                component: components.RichTooltipComponent,
            })),
        ),
    );
}
