import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {ActivatedRoute} from '@angular/router';

/**
 * Component displaying adaptive instance results visualizations
 */
@Component({
    selector: 'crczp-adaptive-instance-results',
    templateUrl: './adaptive-instance-results.component.html',
    styleUrls: ['./adaptive-instance-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveInstanceResultsComponent {
    private activeRoute = inject(ActivatedRoute);
}
