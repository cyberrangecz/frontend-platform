import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FocusMonitor } from '@angular/cdk/a11y';
import { NotificationService } from '@crczp/utils';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LogView } from './log-view.component';
import { DEFAULT_LOG_VIEW_APPEARANCE, LOG_VIEW_SETTINGS } from './log-view-settings';
import { ANSIBLE_SKELETON_SAMPLE, TERRAFORM_SKELETON_SAMPLE } from './log-view-skeleton-samples';
import { LOG_VIEW_TOOLTIP_SHOW_DELAY } from './log-view-tooltip.directive';
import { saveAs } from 'file-saver';

vi.mock('file-saver', () => ({ saveAs: vi.fn() }));

describe('LogView', () => {
    let fixture: ComponentFixture<LogView>;
    let intersectionCallbacks: IntersectionObserverCallback[];
    let resizeCallbacks: ResizeObserverCallback[];

    const documentText = () =>
        EditorView.findFromDOM(fixture.nativeElement.querySelector('.cm-editor'))?.state.doc.toString();
    const contentElement = () => fixture.nativeElement.querySelector('.cm-content') as HTMLElement;

    const render = () => {
        fixture.detectChanges();
        TestBed.tick();
    };

    const setValue = (value: string) => {
        fixture.componentRef.setInput('value', value);
        render();
    };

    beforeEach(() => {
        intersectionCallbacks = [];
        resizeCallbacks = [];
        vi.stubGlobal(
            'ResizeObserver',
            class {
                constructor(callback: ResizeObserverCallback) {
                    resizeCallbacks.push(callback);
                }
                observe = vi.fn();
                unobserve = vi.fn();
                disconnect = vi.fn();
            },
        );
        vi.stubGlobal(
            'IntersectionObserver',
            class {
                constructor(callback: IntersectionObserverCallback) {
                    intersectionCallbacks.push(callback);
                }
                observe = vi.fn();
                disconnect = vi.fn();
            },
        );
        TestBed.configureTestingModule({
            providers: [{ provide: NotificationService, useValue: { emit: vi.fn() } }],
        });
        fixture = TestBed.createComponent(LogView);
        render();
    });

    describe('line endings', () => {
        it('appends across polls when the log uses CRLF', () => {
            setValue('first\r\nsecond\r\nthi');
            setValue('first\r\nsecond\r\nthird\r\nfourth\r\n');
            expect(documentText()).toBe('first\nsecond\nthird\nfourth\n');
        });

        it('appends across polls when the log uses lone CR', () => {
            setValue('first\rsecond\rthi');
            setValue('first\rsecond\rthird\rfourth');
            expect(documentText()).toBe('first\nsecond\nthird\nfourth');
        });

        it('appends when a poll ends between the CR and the LF of one line ending', () => {
            setValue('first\r');
            setValue('first\r\nsecond');
            expect(documentText()).toBe('first\nsecond');
        });
    });

    describe('loading skeleton', () => {
        const skeleton = () => fixture.nativeElement.querySelector('crczp-log-view-skeleton');
        const button = (label: string) =>
            fixture.nativeElement.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;

        const startLoading = () => {
            fixture.componentRef.setInput('loading', true);
            render();
        };

        it('shows no skeleton while not loading', () => {
            expect(skeleton()).toBeNull();
            expect(contentElement().hasAttribute('aria-busy')).toBe(false);
        });

        it('shows the skeleton over an empty, busy log with copy and search disabled', () => {
            startLoading();
            expect(skeleton()).not.toBeNull();
            expect(documentText()).toBe('');
            expect(contentElement().getAttribute('aria-busy')).toBe('true');
            expect(button('Copy to clipboard').disabled).toBe(true);
            expect(button('Download log').disabled).toBe(true);
            expect(button('Search log').disabled).toBe(true);
        });

        it('replaces the skeleton with the log text in one render', () => {
            startLoading();
            fixture.componentRef.setInput('loading', false);
            fixture.componentRef.setInput('value', 'first\nsecond');
            render();
            expect(skeleton()).toBeNull();
            expect(documentText()).toBe('first\nsecond');
            expect(contentElement().hasAttribute('aria-busy')).toBe(false);
            expect(button('Copy to clipboard').disabled).toBe(false);
            expect(button('Download log').disabled).toBe(false);
        });

        it('repeats the sample of the highlighted format', () => {
            const sampleRows = () => skeleton()?.style.getPropertyValue('--skeleton-sample-rows');
            fixture.componentRef.setInput('syntaxHighlighting', 'ansible');
            startLoading();
            expect(sampleRows()).toBe(`${ANSIBLE_SKELETON_SAMPLE.length}`);
            fixture.componentRef.setInput('syntaxHighlighting', 'terraform');
            render();
            expect(sampleRows()).toBe(`${TERRAFORM_SKELETON_SAMPLE.length}`);
        });
    });

    describe('content attributes', () => {
        const expectNotEditableText = () => {
            const content = contentElement();
            expect(content.getAttribute('spellcheck')).toBe('false');
            expect(content.getAttribute('autocorrect')).toBe('off');
            expect(content.getAttribute('autocapitalize')).toBe('off');
            expect(content.getAttribute('data-gramm')).toBe('false');
            expect(content.getAttribute('data-gramm_editor')).toBe('false');
            expect(content.getAttribute('data-enable-grammarly')).toBe('false');
            expect(content.getAttribute('aria-readonly')).toBe('true');
        };

        it('marks the content as not editable text after creation', () => {
            expectNotEditableText();
        });

        it('keeps the marks, line wrapping and the log after a syntax highlighting change', () => {
            setValue('line one\nline two');
            fixture.componentRef.setInput('syntaxHighlighting', 'terraform');
            render();
            expectNotEditableText();
            expect(contentElement().classList.contains('cm-lineWrapping')).toBe(true);
            expect(documentText()).toBe('line one\nline two');
        });
    });

    describe('appearance settings', () => {
        const host = () => fixture.nativeElement as HTMLElement;
        const appearanceButton = () =>
            host().querySelector('button[aria-label="Appearance settings"]') as HTMLButtonElement;

        afterEach(() => {
            LOG_VIEW_SETTINGS.update(DEFAULT_LOG_VIEW_APPEARANCE);
        });

        it('opens the panel from the Appearance settings button and closes it on Escape, focusing that button', () => {
            document.body.appendChild(host());
            appearanceButton().click();
            render();
            const panel = host().querySelector('crczp-log-view-settings-panel');
            expect(panel).not.toBeNull();
            expect(appearanceButton().getAttribute('aria-expanded')).toBe('true');
            panel
                ?.querySelector('.settings-panel')
                ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            render();
            expect(host().querySelector('crczp-log-view-settings-panel')).toBeNull();
            expect(document.activeElement).toBe(appearanceButton());
        });

        it('shows the text colour icon while the panel is closed and a close icon while it is open', () => {
            const iconOf = () => appearanceButton().querySelector('mat-icon')?.textContent?.trim();
            render();
            expect(iconOf()).toBe('format_color_text');
            appearanceButton().click();
            render();
            expect(iconOf()).toBe('close');
        });

        it('switches the line wrap icon with the wrapping state', () => {
            const wrapButton = host().querySelector('button[aria-label="Line wrap"]') as HTMLButtonElement;
            const iconOf = () => wrapButton.querySelector('mat-icon')?.textContent?.trim();
            render();
            const before = iconOf();
            wrapButton.click();
            render();
            expect(before).not.toBe(iconOf());
            expect([before, iconOf()].sort()).toEqual(['format_align_left', 'wrap_text']);
            expect(wrapButton.classList.contains('control-button--active')).toBe(false);
        });

        it('sets the colour scheme and palette of the stored preset on every log view', () => {
            const second = TestBed.createComponent(LogView);
            second.detectChanges();
            LOG_VIEW_SETTINGS.update({ presetId: 'platform-dark' });
            render();
            second.detectChanges();
            TestBed.tick();
            expect(host().style.colorScheme).toBe('dark');
            expect(second.nativeElement.style.colorScheme).toBe('dark');
            LOG_VIEW_SETTINGS.update({ presetId: 'platform-light' });
            TestBed.tick();
            expect(host().style.colorScheme).toBe('light');
        });

        it('applies the stored font and keeps the document when the preset or level changes', () => {
            setValue('line one\nline two');
            LOG_VIEW_SETTINGS.update({ fontSize: 20, fontWeight: 700, presetId: 'platform-dark', highlightLevel: 'none' });
            render();
            expect(host().style.getPropertyValue('--log-font-size')).toBe('20px');
            expect(host().style.getPropertyValue('--log-font-weight')).toBe('700');
            expect(documentText()).toBe('line one\nline two');
        });

        it('lets the input override the stored highlighting level', () => {
            LOG_VIEW_SETTINGS.update({ highlightLevel: 'none' });
            render();
            const stored = host().style.getPropertyValue('--log-token-error');
            fixture.componentRef.setInput('highlightLevel', 'full');
            render();
            expect(host().style.getPropertyValue('--log-token-error')).not.toBe(stored);
        });
    });

    describe('reveal of a hidden log', () => {
        const reportVisibility = (isIntersecting: boolean) =>
            intersectionCallbacks.forEach((callback) =>
                callback([{ isIntersecting } as IntersectionObserverEntry], {} as IntersectionObserver),
            );

        const createWithScroller = () => {
            vi.useFakeTimers();
            fixture = TestBed.createComponent(LogView);
            render();
            vi.advanceTimersByTime(100);
        };

        const scrollerOf = (): HTMLElement => fixture.nativeElement.querySelector('.cm-scroller');

        afterEach(() => vi.useRealTimers());

        it('scrolls to the end of the document when the log becomes visible', () => {
            createWithScroller();
            const setScrollTop = vi.spyOn(scrollerOf(), 'scrollTop', 'set');
            reportVisibility(false);
            reportVisibility(true);
            expect(setScrollTop).toHaveBeenCalledTimes(1);
        });

        it('leaves the scroll position when the log was not at the end before it was hidden', () => {
            createWithScroller();
            const setScrollTop = vi.spyOn(scrollerOf(), 'scrollTop', 'set');
            reportVisibility(true);
            vi.spyOn(scrollerOf(), 'scrollHeight', 'get').mockReturnValue(5000);
            reportVisibility(false);
            reportVisibility(true);
            expect(setScrollTop).toHaveBeenCalledTimes(1);
        });

        describe('of a log scrolled away from its end', () => {
            const SCROLLED_TOP = 2000; // px
            const DRIFTED_TOP = 600; // px
            const longLog = Array.from({ length: 400 }, (_, index) => `line ${index + 1}`).join('\n');

            const viewOf = (): EditorView => {
                const view = EditorView.findFromDOM(fixture.nativeElement.querySelector('.cm-editor'));
                if (!view) throw new Error('No editor view rendered');
                return view;
            };
            const topLineNumber = () => {
                const view = viewOf();
                const height = view.scrollDOM.scrollTop * view.scaleY - view.documentPadding.top;
                return view.state.doc.lineAt(view.lineBlockAtHeight(height).from).number;
            };
            const scrollTo = (top: number) => {
                scrollerOf().scrollTop = top;
                scrollerOf().dispatchEvent(new Event('scroll'));
            };
            const reportResize = () =>
                resizeCallbacks.forEach((callback) => callback([], {} as ResizeObserver));
            const appendLine = () => {
                const view = viewOf();
                view.dispatch({ changes: { from: view.state.doc.length, insert: '\nappended line' } });
            };
            const driftAndRemeasure = () => {
                scrollerOf().scrollTop = DRIFTED_TOP;
                appendLine();
            };

            const scrollAwayFromTheEnd = () => {
                createWithScroller();
                setValue(longLog);
                vi.advanceTimersByTime(100);
                reportVisibility(true);
                vi.spyOn(scrollerOf(), 'scrollHeight', 'get').mockReturnValue(100_000);
                scrollTo(SCROLLED_TOP);
                return topLineNumber();
            };

            it('keeps its top line when the editor heights change after a resize', () => {
                const scrolledLine = scrollAwayFromTheEnd();
                reportResize();
                driftAndRemeasure();
                expect(topLineNumber()).toBe(scrolledLine);
            });

            it('keeps its top line through being hidden and shown again', () => {
                const scrolledLine = scrollAwayFromTheEnd();
                reportVisibility(false);
                driftAndRemeasure();
                reportVisibility(true);
                driftAndRemeasure();
                expect(topLineNumber()).toBe(scrolledLine);
            });

            it('follows the person scrolling after the hold', () => {
                const scrolledLine = scrollAwayFromTheEnd();
                reportResize();
                scrollerOf().dispatchEvent(new WheelEvent('wheel', { bubbles: true }));
                scrollTo(DRIFTED_TOP);
                const personLine = topLineNumber();
                appendLine();
                expect(personLine).not.toBe(scrolledLine);
                expect(topLineNumber()).toBe(personLine);
            });
        });
    });

    describe('toolbar actions', () => {
        const ANSIBLE_LOG = 'TASK [ping]\nok: [web] => {"changed": false, "ping": "pong"}\n';
        const PRETTIFIED_LOG = 'TASK [ping]\nok: [web] => {\n  "changed": false,\n  "ping": "pong"\n}\n';
        const host = () => fixture.nativeElement as HTMLElement;
        const button = (label: string) =>
            host().querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement;
        const press = (target: EventTarget, init: KeyboardEventInit) => {
            const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
            target.dispatchEvent(event);
            render();
            return event;
        };
        const altShift = (code: string, key = code.slice(3)) => ({ code, key, altKey: true, shiftKey: true });
        const isWrapping = () => contentElement().classList.contains('cm-lineWrapping');
        const showAnsibleLog = (isJsonPrettified: boolean) => {
            LOG_VIEW_SETTINGS.update({ jsonPrettified: isJsonPrettified });
            fixture.componentRef.setInput('syntaxHighlighting', 'ansible');
            setValue(ANSIBLE_LOG);
        };

        let writeText: ReturnType<typeof vi.fn>;

        beforeEach(() => {
            writeText = vi.fn().mockResolvedValue(undefined);
            Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
            vi.mocked(saveAs).mockClear();
            document.body.appendChild(host());
        });

        afterEach(() => {
            LOG_VIEW_SETTINGS.update({ lineWrapping: true, jsonPrettified: true });
            host().remove();
        });

        describe('shortcuts', () => {
            it('runs a shortcut pressed in the editor or on the toolbar', () => {
                const wasWrapping = isWrapping();
                expect(press(contentElement(), altShift('KeyW')).defaultPrevented).toBe(true);
                expect(isWrapping()).toBe(!wasWrapping);
                press(button('Scroll to top'), altShift('KeyW'));
                expect(isWrapping()).toBe(wasWrapping);
            });

            it('ignores a shortcut pressed outside the log view', () => {
                const wasWrapping = isWrapping();
                expect(press(document.body, altShift('KeyW')).defaultPrevented).toBe(false);
                expect(isWrapping()).toBe(wasWrapping);
            });

            it('matches the physical key when Option on macOS types another character', () => {
                const wasWrapping = isWrapping();
                press(contentElement(), altShift('KeyW', '„'));
                expect(isWrapping()).toBe(!wasWrapping);
            });

            it('toggles fullscreen and the appearance settings', () => {
                press(contentElement(), altShift('KeyF'));
                expect(button('Fullscreen').getAttribute('aria-pressed')).toBe('true');
                press(contentElement(), altShift('KeyF'));
                expect(button('Fullscreen').getAttribute('aria-pressed')).toBe('false');
                press(contentElement(), altShift('KeyS'));
                expect(host().querySelector('crczp-log-view-settings-panel')).not.toBeNull();
                press(contentElement(), altShift('KeyS'));
                expect(host().querySelector('crczp-log-view-settings-panel')).toBeNull();
                expect(document.activeElement).toBe(button('Appearance settings'));
            });

            it('opens the search panel on Ctrl+F from the toolbar', () => {
                press(button('Scroll to top'), { code: 'KeyF', key: 'f', ctrlKey: true });
                expect(host().querySelector('.cm-search')).not.toBeNull();
            });

            it('does nothing for Prettify JSON when the log has no JSON to prettify', () => {
                setValue('plain line');
                const event = press(contentElement(), altShift('KeyP'));
                expect(event.defaultPrevented).toBe(false);
                expect(LOG_VIEW_SETTINGS.value().jsonPrettified).toBe(true);
            });

            it('does nothing for Copy and Download while the log is loading', () => {
                fixture.componentRef.setInput('loading', true);
                render();
                press(contentElement(), altShift('KeyC'));
                press(contentElement(), altShift('KeyD'));
                expect(writeText).not.toHaveBeenCalled();
                expect(saveAs).not.toHaveBeenCalled();
            });
        });

        describe('copy and download', () => {
            const savedFile = () => {
                const [blob, fileName] = vi.mocked(saveAs).mock.calls[0] ?? [];
                return { blob: blob as Blob, fileName };
            };

            it('copies the log as shown with Prettify JSON on and off', () => {
                showAnsibleLog(true);
                button('Copy to clipboard').click();
                expect(writeText).toHaveBeenLastCalledWith(PRETTIFIED_LOG);
                LOG_VIEW_SETTINGS.update({ jsonPrettified: false });
                render();
                press(contentElement(), altShift('KeyC'));
                expect(writeText).toHaveBeenLastCalledWith(ANSIBLE_LOG);
            });

            it('copies line feeds, as the log shows them', () => {
                setValue('first\r\nsecond\r\n');
                button('Copy to clipboard').click();
                expect(writeText).toHaveBeenCalledWith('first\nsecond\n');
            });

            it('downloads the prettified log as plain text under the given file name', async () => {
                showAnsibleLog(true);
                fixture.componentRef.setInput('downloadFileName', 'user-ansible-stage-request-7.log');
                render();
                press(contentElement(), altShift('KeyD'));
                const { blob, fileName } = savedFile();
                expect(fileName).toBe('user-ansible-stage-request-7.log');
                expect(blob.type).toBe('text/plain;charset=utf-8');
                expect(await blob.text()).toBe(PRETTIFIED_LOG);
            });

            it('downloads the raw log under the default file name with Prettify JSON off', async () => {
                showAnsibleLog(false);
                button('Download log').click();
                const { blob, fileName } = savedFile();
                expect(fileName).toBe('log.log');
                expect(await blob.text()).toBe(ANSIBLE_LOG);
            });

            it('offers neither while the log is empty', () => {
                expect(button('Copy to clipboard').disabled).toBe(true);
                expect(button('Download log').disabled).toBe(true);
            });
        });

        describe('tooltip', () => {
            const tooltip = (): HTMLElement | null => document.querySelector('crczp-log-view-tooltip');
            const rows = () => Array.from(tooltip()?.children ?? []).map((row) => row.textContent?.trim());
            const hover = (target: HTMLElement) => {
                target.dispatchEvent(new MouseEvent('mouseenter'));
                vi.advanceTimersByTime(LOG_VIEW_TOOLTIP_SHOW_DELAY);
                render();
            };

            beforeEach(() => vi.useFakeTimers());
            afterEach(() => vi.useRealTimers());

            it('shows the action, then the shortcut in a second row, after the delay', () => {
                button('Line wrap').dispatchEvent(new MouseEvent('mouseenter'));
                vi.advanceTimersByTime(LOG_VIEW_TOOLTIP_SHOW_DELAY - 1);
                render();
                expect(tooltip()).toBeNull();
                vi.advanceTimersByTime(1);
                render();
                expect(rows()).toEqual(['Line wrap', 'Alt+Shift+W']);
                expect(tooltip()?.querySelector('.tooltip-shortcut')?.textContent?.trim()).toBe('Alt+Shift+W');
            });

            it('writes the shortcut with macOS symbols on macOS', () => {
                const userAgent = vi
                    .spyOn(navigator, 'userAgent', 'get')
                    .mockReturnValue('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15');
                host().remove();
                fixture = TestBed.createComponent(LogView);
                document.body.appendChild(host());
                render();
                userAgent.mockRestore();
                hover(button('Line wrap'));
                expect(rows()).toEqual(['Line wrap', '⌥⇧W']);
            });

            it('describes the button while shown and closes when the pointer leaves', () => {
                const target = button('Scroll to end');
                hover(target);
                expect(tooltip()?.getAttribute('role')).toBe('tooltip');
                expect(target.getAttribute('aria-describedby')).toBe(tooltip()?.id);
                target.dispatchEvent(new MouseEvent('mouseleave'));
                render();
                expect(tooltip()).toBeNull();
                expect(target.hasAttribute('aria-describedby')).toBe(false);
            });

            it('stays hidden while the appearance panel is open', () => {
                const appearance = button('Appearance settings');
                hover(appearance);
                expect(tooltip()).not.toBeNull();
                appearance.click();
                render();
                expect(tooltip()).toBeNull();
                expect(appearance.hasAttribute('aria-describedby')).toBe(false);
                hover(appearance);
                expect(tooltip()).toBeNull();
                appearance.click();
                render();
                hover(appearance);
                expect(tooltip()).not.toBeNull();
            });

            it('follows the state of a toggle while shown', () => {
                hover(button('Fullscreen'));
                expect(rows()[0]).toBe('Fullscreen');
                button('Fullscreen').click();
                render();
                expect(rows()[0]).toBe('Exit fullscreen');
            });

            it('closes on Escape before Escape leaves fullscreen', () => {
                button('Fullscreen').click();
                render();
                hover(button('Fullscreen'));
                press(document.body, { key: 'Escape', code: 'Escape' });
                expect(tooltip()).toBeNull();
                expect(button('Fullscreen').getAttribute('aria-pressed')).toBe('true');
                press(document.body, { key: 'Escape', code: 'Escape' });
                expect(button('Fullscreen').getAttribute('aria-pressed')).toBe('false');
            });

            it('opens on keyboard focus and closes on blur, but not on mouse focus', () => {
                const focusMonitor = TestBed.inject(FocusMonitor);
                const target = button('Line wrap');
                focusMonitor.focusVia(target, 'mouse');
                vi.advanceTimersByTime(LOG_VIEW_TOOLTIP_SHOW_DELAY);
                render();
                expect(tooltip()).toBeNull();
                target.blur();
                focusMonitor.focusVia(target, 'keyboard');
                vi.advanceTimersByTime(LOG_VIEW_TOOLTIP_SHOW_DELAY);
                render();
                expect(tooltip()).not.toBeNull();
                target.blur();
                render();
                expect(tooltip()).toBeNull();
            });
        });
    });
});
