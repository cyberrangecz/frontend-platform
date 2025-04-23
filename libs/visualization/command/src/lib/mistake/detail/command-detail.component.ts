import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { AggregatedCommands } from '../model/aggregated-commands';

@Component({
    selector: 'crczp-command-visualizations-command-detail',
    templateUrl: './command-detail.component.html',
    styleUrls: ['./command-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandDetailComponent {
    @HostBinding('style.width') width = '100%';
    @Input() data: AggregatedCommands;
}
