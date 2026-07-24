import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'crczp-chart-row',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chart-row.component.html',
    styleUrl: './chart-row.component.scss',
    host: { class: 'round-scrollbar' },
})
export class ChartRowComponent {}
