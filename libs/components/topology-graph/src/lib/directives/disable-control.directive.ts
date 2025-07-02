import {Directive, Input} from '@angular/core';
import {NgControl} from '@angular/forms';

@Directive({
    selector: '[disableControl]',
})
export class DisableControlDirective {
    constructor(private ngControl: NgControl) {}

    @Input() set disableControl(condition: boolean) {
        const action = condition ? 'disable' : 'enable';
        this.ngControl.control[action]();
    }
}
