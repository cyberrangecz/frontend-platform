vi.mock('@crczp/components', () => ({ LOGGING_ERROR_MARKER: '[error]' }));
vi.mock('../request-detail/components/stage/request-stage.component', async () => {
    const { Component } = await import('@angular/core');
    class RequestStageComponent {}
    Component({
        selector: 'crczp-request-stage',
        inputs: ['stage', 'height'],
        template: '<button class="stage-button">Action</button>',
    })(RequestStageComponent);
    return { RequestStageComponent };
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Request } from '@crczp/sandbox-model';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { RequestStagesService } from '../request-detail/services/state/request-stages.service';
import { AllocationRequestDetailComponent } from '../request-detail/components/allocation-request-detail.component';

const stageAdapter = () => ({
    hasFinished: () => false,
    hasFailed: () => false,
    isRunning: () => false,
    isAnsibleStage: () => false,
    logoSrc: '',
    title: 'Allocation',
});

describe('RequestDetailComponent carousel', () => {
    let fixture: ComponentFixture<AllocationRequestDetailComponent>;
    let hashSetter: ReturnType<typeof vi.fn>;

    const items = () =>
        Array.from(fixture.nativeElement.querySelectorAll('.carousel-item')) as HTMLElement[];
    const stageOf = (item: HTMLElement) => item.querySelector('crczp-request-stage') as HTMLElement;

    const render = (fragment: string) => {
        TestBed.configureTestingModule({
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        fragment: new BehaviorSubject<string | null>(fragment),
                        data: of({ [Request.name]: { id: 1 } }),
                    },
                },
            ],
        });
        TestBed.overrideComponent(AllocationRequestDetailComponent, {
            set: {
                providers: [
                    {
                        provide: RequestStagesService,
                        useValue: {
                            getAll: () => of([]),
                            startPolling: vi.fn(),
                            stages$: of([stageAdapter(), stageAdapter(), stageAdapter()]),
                            hasError$: of(false),
                            isLoading$: of(false),
                        },
                    },
                ],
            },
        });
        hashSetter = vi.fn();
        vi.spyOn(TestBed.inject(Router), 'navigate').mockImplementation((_commands, extras) => {
            hashSetter(extras?.fragment);
            return Promise.resolve(true);
        });
        fixture = TestBed.createComponent(AllocationRequestDetailComponent);
        fixture.detectChanges();
    };

    const pressKey = (key: string, init: KeyboardEventInit = {}, target: EventTarget = document.body) => {
        const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
        target.dispatchEvent(event);
        return event;
    };

    it('does not intercept Tab or vertical arrow keys', () => {
        render('stage-2');
        for (const key of ['Tab', 'ArrowUp', 'ArrowDown']) {
            expect(pressKey(key).defaultPrevented).toBe(false);
        }
        expect(hashSetter).not.toHaveBeenCalled();
    });

    it('keeps slides in fixed stage order and places them with the order property', () => {
        render('stage-2');
        expect(items().map((item) => item.style.order)).toEqual(['0', '1', '2']);
        const nodes = items();
        (TestBed.inject(ActivatedRoute).fragment as BehaviorSubject<string | null>).next('stage-3');
        fixture.detectChanges();
        expect(items()).toEqual(nodes);
        expect(items().map((item) => item.style.order)).toEqual(['2', '0', '1']);
    });

    it('goes to the previous and next stage on Left and Right anywhere on the page', () => {
        render('stage-2');
        expect(pressKey('ArrowRight').defaultPrevented).toBe(true);
        expect(hashSetter).toHaveBeenLastCalledWith('stage-3');
        pressKey('ArrowLeft');
        expect(hashSetter).toHaveBeenLastCalledWith('stage-1');
    });

    it('wraps from the last stage to the first and back', () => {
        render('stage-3');
        pressKey('ArrowRight');
        expect(hashSetter).toHaveBeenLastCalledWith('stage-1');
        TestBed.resetTestingModule();
        render('stage-1');
        pressKey('ArrowLeft');
        expect(hashSetter).toHaveBeenLastCalledWith('stage-3');
    });

    it('ignores arrows inside the log editor, its search field, other text inputs and the appearance panel', () => {
        render('stage-2');
        const editor = document.createElement('div');
        editor.className = 'cm-editor';
        const content = document.createElement('div');
        editor.append(content);
        const searchField = document.createElement('input');
        const area = document.createElement('textarea');
        const editable = document.createElement('div');
        editable.setAttribute('contenteditable', 'true');
        const appearancePanel = document.createElement('crczp-log-view-settings-panel');
        const presetOption = document.createElement('div');
        appearancePanel.append(presetOption);
        document.body.append(editor, searchField, area, editable, appearancePanel);
        for (const target of [content, searchField, area, editable, presetOption]) {
            expect(pressKey('ArrowRight', {}, target).defaultPrevented).toBe(false);
        }
        expect(hashSetter).not.toHaveBeenCalled();
        editor.remove();
        searchField.remove();
        area.remove();
        editable.remove();
        appearancePanel.remove();
    });

    it('ignores arrows while a modifier key is held or the event is already handled', () => {
        render('stage-2');
        for (const init of [{ ctrlKey: true }, { altKey: true }, { metaKey: true }, { shiftKey: true }]) {
            pressKey('ArrowRight', init);
        }
        document.body.addEventListener('keydown', (event) => event.preventDefault(), { once: true });
        pressKey('ArrowLeft');
        expect(hashSetter).not.toHaveBeenCalled();
    });

    it('makes the stage of every non-current slide inert and leaves the current one interactive', () => {
        render('stage-2');
        const [left, center, right] = items().map(stageOf);
        expect(left!.hasAttribute('inert')).toBe(true);
        expect(right!.hasAttribute('inert')).toBe(true);
        expect(center!.hasAttribute('inert')).toBe(false);
    });

    it('puts only the current slide in the tab order', () => {
        render('stage-2');
        expect(items().map((item) => item.tabIndex)).toEqual([-1, 0, -1]);
    });

    it('labels every slide as a group by its stage number and title', () => {
        render('stage-2');
        expect(items().map((item) => item.getAttribute('role'))).toEqual(['group', 'group', 'group']);
        expect(items().map((item) => item.getAttribute('aria-label'))).toEqual([
            'Stage 1 of 3: Allocation',
            'Stage 2 of 3: Allocation',
            'Stage 3 of 3: Allocation',
        ]);
    });

    it('switches slides by a click on a side slide', () => {
        render('stage-2');
        items()[2]!.click();
        expect(hashSetter).toHaveBeenLastCalledWith('stage-3');
        items()[0]!.click();
        expect(hashSetter).toHaveBeenLastCalledWith('stage-1');
    });

    it('does not switch slides on a click or Enter inside the current slide', () => {
        render('stage-2');
        const button = stageOf(items()[1]!).querySelector('button')!;
        button.click();
        button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        expect(hashSetter).not.toHaveBeenCalled();
    });
});
