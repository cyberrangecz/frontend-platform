import { Directive, ElementRef, EventEmitter, HostListener, Output, inject } from '@angular/core';

@Directive({ selector: '[mouseWheel]' })
export class MouseWheelDirective {
    element = inject(ElementRef);

    @Output() mouseWheelUp = new EventEmitter();
    @Output() mouseWheelDown = new EventEmitter();

    @HostListener('mousewheel', ['$event']) onMouseWheelChrome(event: any) {
        this.mouseWheelFunc(event);
    }

    @HostListener('DOMMouseScroll', ['$event']) onMouseWheelFirefox(event: any) {
        this.mouseWheelFunc(event);
    }

    @HostListener('onmousewheel', ['$event']) onMouseWheelIE(event: any) {
        this.mouseWheelFunc(event);
    }

    mouseWheelFunc(event: any) {
        const mouseEvent = window.event || event;
        const delta = Math.max(-1, Math.min(1, mouseEvent.wheelDelta || -mouseEvent.detail));
        const pos: any = {
            top: mouseEvent.clientY - this.element.nativeElement.getBoundingClientRect().top,
            left: mouseEvent.clientX - this.element.nativeElement.getBoundingClientRect().left,
        };
        if (typeof mouseEvent.ctrlKey === 'undefined' || mouseEvent.ctrlKey !== true) {
            return;
        }
        if (delta > 0) {
            this.mouseWheelUp.emit(pos);
        } else if (delta < 0) {
            this.mouseWheelDown.emit(pos);
        }
        // for IE
        mouseEvent.returnValue = false;
        // for Chrome and Firefox
        if (mouseEvent.preventDefault) {
            mouseEvent.preventDefault();
        }
    }
}
