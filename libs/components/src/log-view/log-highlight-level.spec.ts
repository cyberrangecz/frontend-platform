import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NotificationService } from '@crczp/utils';
import { EditorView } from '@codemirror/view';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    applyLogHighlightLevel,
    LOG_HIGHLIGHT_LEVELS,
    LogHighlightLevel,
    tokenTreatment,
} from './log-highlight-level';
import { LOG_TOKEN_SLOTS, LogTokenKind, tokenVariableName } from './log-token-slots';
import { LogView } from './log-view.component';

const ALL_KINDS = Object.keys(LOG_TOKEN_SLOTS) as LogTokenKind[];

const ERRORS: LogTokenKind[] = [
    'error',
    'fatalError',
    'errorLine',
    'statusFailed',
    'statusUnreachable',
    'recapFailed',
    'recapUnreachable',
    'warning',
    'deprecation',
    'statusIgnoring',
    'recapIgnored',
];
const CHANGES_AND_STRUCTURE: LogTokenKind[] = [
    'added',
    'changed',
    'destroyed',
    'replaced',
    'statusChanged',
    'recapChanged',
    'playHeader',
    'taskHeader',
    'heading',
    'playRecap',
];
const VALUES: LogTokenKind[] = [
    'string',
    'number',
    'booleanTrue',
    'booleanFalse',
    'timestamp',
    'version',
    'elapsedTime',
];
const PALE: LogTokenKind[] = ['comment', 'bracket', 'taskPath', 'statusSkipping', 'recapSkipped'];

const kindsWith = (level: LogHighlightLevel, treatment: string) =>
    ALL_KINDS.filter((kind) => tokenTreatment(level, kind) === treatment);

describe('log highlight levels', () => {
    it('lists the levels from the least to the most coloured', () => {
        expect(LOG_HIGHLIGHT_LEVELS).toEqual(['none', 'errors', 'reduced', 'full']);
    });

    it('draws every kind as plain text at none', () => {
        expect(kindsWith('none', 'plain')).toEqual(ALL_KINDS);
    });

    it('colours errors and warnings only at errors', () => {
        expect(kindsWith('errors', 'coloured').sort()).toEqual([...ERRORS].sort());
        expect(kindsWith('errors', 'pale')).toEqual([]);
        expect(kindsWith('errors', 'plain')).toHaveLength(ALL_KINDS.length - ERRORS.length);
    });

    it('adds changes, structure and value types, and the pale kinds, at reduced', () => {
        expect(kindsWith('reduced', 'coloured').sort()).toEqual(
            [...ERRORS, ...CHANGES_AND_STRUCTURE, ...VALUES].sort(),
        );
        expect(kindsWith('reduced', 'pale').sort()).toEqual([...PALE].sort());
        expect(kindsWith('reduced', 'plain')).toHaveLength(
            ALL_KINDS.length -
                ERRORS.length -
                CHANGES_AND_STRUCTURE.length -
                VALUES.length -
                PALE.length,
        );
    });

    it('colours every kind at full', () => {
        expect(kindsWith('full', 'coloured')).toEqual(ALL_KINDS);
    });

    it('names only kinds that exist', () => {
        [...ERRORS, ...CHANGES_AND_STRUCTURE, ...VALUES, ...PALE].forEach((kind) =>
            expect(ALL_KINDS).toContain(kind),
        );
    });

    it('sets every kind to its slot, the pale slot or the foreground', () => {
        const element = document.createElement('div');
        applyLogHighlightLevel(element, 'reduced');
        const value = (kind: LogTokenKind) => element.style.getPropertyValue(tokenVariableName(kind));
        expect(value('error')).toBe(`var(--log-ansi-${LOG_TOKEN_SLOTS.error})`);
        expect(value('comment')).toBe('var(--log-ansi-8)');
        expect(value('string')).toBe(`var(--log-ansi-${LOG_TOKEN_SLOTS.string})`);
        expect(value('property')).toBe('var(--log-foreground)');
        ALL_KINDS.forEach((kind) => expect(value(kind)).not.toBe(''));
    });

    it('sets every kind to its own slot at full', () => {
        const element = document.createElement('div');
        applyLogHighlightLevel(element, 'full');
        ALL_KINDS.forEach((kind) =>
            expect(element.style.getPropertyValue(tokenVariableName(kind))).toBe(
                `var(--log-ansi-${LOG_TOKEN_SLOTS[kind]})`,
            ),
        );
    });
});

describe('LogView highlight level input', () => {
    let fixture: ComponentFixture<LogView>;

    beforeEach(() => {
        vi.stubGlobal('ResizeObserver', class { observe = vi.fn(); disconnect = vi.fn(); });
        vi.stubGlobal('IntersectionObserver', class { observe = vi.fn(); disconnect = vi.fn(); });
        TestBed.configureTestingModule({
            providers: [{ provide: NotificationService, useValue: { emit: vi.fn() } }],
        });
        fixture = TestBed.createComponent(LogView);
        fixture.detectChanges();
        TestBed.tick();
    });

    afterEach(() => vi.unstubAllGlobals());

    const hostValue = () =>
        (fixture.nativeElement as HTMLElement).style.getPropertyValue(tokenVariableName('error'));
    const editorView = () =>
        EditorView.findFromDOM(fixture.nativeElement.querySelector('.cm-editor'));

    it('colours every kind by default', () => {
        expect(hostValue()).toBe(`var(--log-ansi-${LOG_TOKEN_SLOTS.error})`);
    });

    it('recolours on a level switch without replacing the document', () => {
        fixture.componentRef.setInput('value', 'hello\n');
        fixture.detectChanges();
        TestBed.tick();
        const view = editorView();
        const documentBefore = view?.state.doc;

        fixture.componentRef.setInput('highlightLevel', 'none');
        fixture.detectChanges();
        TestBed.tick();

        expect(hostValue()).toBe('var(--log-foreground)');
        expect(editorView()?.state.doc).toBe(documentBefore);
    });
});
