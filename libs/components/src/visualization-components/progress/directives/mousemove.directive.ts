import { map, mergeMap, takeUntil } from 'rxjs/operators';
import { Directive, ElementRef, EventEmitter, HostListener, inject, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';

@Directive({ selector: '[crczpMouseMove]' })
export class MouseMoveDirective implements OnInit {
    element = inject(ElementRef);
    @Output() mouseUp = new EventEmitter();
    @Output() mouseDown = new EventEmitter();
    @Output() mouseMove = new EventEmitter();
    @Output() mouseDrag = new EventEmitter();
    private drag: Observable<any>;

    constructor() {
        this.element.nativeElement.style.position = 'relative';
        this.element.nativeElement.style.cursor = 'pointer';

        const el = this.element;

        this.drag = this.mouseDown.pipe(
            map(function (event: MouseEvent): any {
                return {
                    top:
                        event.clientY -
                        el.nativeElement.getBoundingClientRect().top,
                    left:
                        event.clientX -
                        el.nativeElement.getBoundingClientRect().left,
                };
            }),
            mergeMap((offset) =>
                this.mouseMove.pipe(
                    map(function (pos: MouseEvent): any {
                        return {
                            top:
                                pos.clientY -
                                el.nativeElement.getBoundingClientRect().top -
                                offset.top,
                            left:
                                pos.clientX -
                                el.nativeElement.getBoundingClientRect().left -
                                offset.left,
                        };
                    }),
                    takeUntil(this.mouseUp)
                )
            )
        );
    }

    @HostListener('document:mouseup', ['$event'])
    onMouseUp(event) {
        const pos: any = {
            top:
                event.clientY -
                this.element.nativeElement.getBoundingClientRect().top,
            left:
                event.clientX -
                this.element.nativeElement.getBoundingClientRect().left,
        };
        this.mouseUp.emit(pos);
    }

    @HostListener('mousedown', ['$event'])
    onMouseDown(event) {
        this.mouseDown.emit(event);
        return false;
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event) {
        this.mouseMove.emit(event);
    }

    ngOnInit() {
        this.drag.subscribe(
            function (pos: any) {
                this.mouseDrag.emit(pos);
            }.bind(this)
        );
    }
}
