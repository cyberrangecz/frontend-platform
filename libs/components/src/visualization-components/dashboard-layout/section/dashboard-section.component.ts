import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'crczp-dashboard-section',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './dashboard-section.component.html',
    styleUrl: './dashboard-section.component.scss',
})
export class DashboardSectionComponent {
    readonly label = input.required<string>();
}
