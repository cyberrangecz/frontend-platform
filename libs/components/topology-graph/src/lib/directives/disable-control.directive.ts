import { Directive, Input, inject } from '@angular/core';
import {NgControl} from '@angular/forms';

@Directive({
    selector: '[disableControl]',
})
export class DisableControlDirective {
    private ngControl = inject(NgControl);


    @Input() set disableControl(condition: boolean) {
        const action = condition ? 'disable' : 'enable';
        this.ngControl.control[action]();
    }
}
