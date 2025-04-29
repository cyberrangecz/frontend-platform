import { ChangeDetectionStrategy, Component, HostBinding, Input } from '@angular/core';
import { MatListModule } from '@angular/material/list';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { AggregatedCommands } from '@crczp/visualization-model';

@Component({
    selector: 'crczp-command-visualizations-command-detail',
    templateUrl: './command-detail.component.html',
    styleUrls: ['./command-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        CommonModule,
        MatListModule,
        MatCardModule,
    ]
})
export class CommandDetailComponent {
    @HostBinding('style.width') width = '100%';
    @Input() data: AggregatedCommands;
}
