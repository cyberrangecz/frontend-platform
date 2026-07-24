import { Directive, input } from '@angular/core';

@Directive({
    selector: '[crczpChartRowItem]',
    standalone: true,
    host: {
        '[style.flex]': '"1 1 0"',
        '[style.min-width]': 'minWidth()',
    },
})
export class ChartRowItemDirective {
    readonly minWidth = input<string>('18rem');
}
