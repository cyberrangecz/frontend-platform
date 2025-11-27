import {
    Directive,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Output,
} from '@angular/core';

@Directive({
    selector: '[crczpClickOutside]',
    standalone: true,
})
export class ClickOutsideDirective {
    @Output() crczpClickOutside = new EventEmitter<void>();
    private elementRef = inject(ElementRef);

    @HostListener('document:click', ['$event.target'])
    public onClick(target: EventTarget): void {
        const clickedInside = this.elementRef.nativeElement.contains(target);

        if (!clickedInside) {
            this.crczpClickOutside.emit();
        }
    }
}
