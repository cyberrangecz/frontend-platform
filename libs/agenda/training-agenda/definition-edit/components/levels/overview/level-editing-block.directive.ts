import { DestroyRef, Directive, effect, ElementRef, inject, input } from '@angular/core';
import { MarkdownEditingLock } from '@crczp/markdown';

/** Text fields that turn read-only: their content stays selectable and copyable. */
const TEXT_FIELD_SELECTOR = 'textarea, input:not([type=checkbox], [type=radio], [type=range], [type=file], [type=button], [type=submit])';

/** Controls that change something on activation, made inert one by one. */
const EDIT_CONTROL_SELECTOR =
    'button, select, input[type=checkbox], input[type=radio], input[type=range], input[type=file], mat-select, mat-checkbox, mat-radio-button, mat-slide-toggle';

/** Areas that stay operable: the markdown editors, which lock themselves, the panel headers and the steppers, which only select. */
const OPERABLE_SELECTOR = 'crczp-markdown-editor, mat-expansion-panel-header, sentinel-stepper';

/** Elements a drag starts from. */
const DRAG_SOURCE_SELECTOR = '.cdk-drag';

const DRAG_START_EVENTS = ['mousedown', 'touchstart'];

/**
 * Blocks editing of the level below it while every read-only action keeps working. Text fields turn
 * read-only and the controls that change something become inert, one element at a time, so
 * containers stay interactive: panels open, content scrolls and can be selected, and the stepper
 * still selects a step. Drag starts are swallowed, so nothing can be reordered. The markdown
 * editors below are locked read-only through {@link MarkdownEditingLock}.
 */
@Directive({
    selector: '[crczpLevelEditingBlock]',
    providers: [{ provide: MarkdownEditingLock, useExisting: LevelEditingBlockDirective }],
})
export class LevelEditingBlockDirective extends MarkdownEditingLock {
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly inertElements = new Set<HTMLElement>();
    private readonly readonlyFields = new Set<HTMLInputElement | HTMLTextAreaElement>();
    private readonly contentObserver = new MutationObserver(() => this.applyBlock());
    private readonly swallowDragStart = (event: Event): void => {
        if ((event.target as Element).closest(DRAG_SOURCE_SELECTOR)) {
            event.stopPropagation();
        }
    };

    readonly blocked = input(false, { alias: 'crczpLevelEditingBlock' });
    readonly locked = this.blocked;

    constructor() {
        super();
        effect(() => (this.blocked() ? this.block() : this.release()));
        inject(DestroyRef).onDestroy(() => this.release());
    }

    private block(): void {
        DRAG_START_EVENTS.forEach((name) => this.host.addEventListener(name, this.swallowDragStart, { capture: true }));
        this.applyBlock();
    }

    private applyBlock(): void {
        this.contentObserver.disconnect();
        this.host.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(TEXT_FIELD_SELECTOR).forEach((field) => {
            if (!field.readOnly && !this.isOperable(field)) {
                field.readOnly = true;
                this.readonlyFields.add(field);
            }
        });
        this.host.querySelectorAll<HTMLElement>(EDIT_CONTROL_SELECTOR).forEach((control) => {
            if (!control.inert && !this.isOperable(control)) {
                control.inert = true;
                this.inertElements.add(control);
            }
        });
        this.contentObserver.observe(this.host, { childList: true, subtree: true });
    }

    private release(): void {
        this.contentObserver.disconnect();
        DRAG_START_EVENTS.forEach((name) => this.host.removeEventListener(name, this.swallowDragStart, { capture: true }));
        this.inertElements.forEach((element) => (element.inert = false));
        this.inertElements.clear();
        this.readonlyFields.forEach((field) => (field.readOnly = false));
        this.readonlyFields.clear();
    }

    private isOperable(element: Element): boolean {
        return element.closest(OPERABLE_SELECTOR) !== null;
    }
}
