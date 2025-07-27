import {
    ChangeDetectionStrategy,
    Component,
    Input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { MatCard } from '@angular/material/card';
import { QuotaPieChartComponent } from './quota-pie-chart/quota-pie-chart.component';
import { Resources } from '@crczp/sandbox-model';
import { LogoSpinnerComponent } from '@crczp/components';

@Component({
    selector: 'crczp-quotas',
    templateUrl: './quotas.component.html',
    styleUrls: ['./quotas.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatCard, QuotaPieChartComponent, LogoSpinnerComponent],
})
export class QuotasComponent implements OnChanges {
    @Input() resources: Resources;
    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
    resourceColors = ['#3D54AF', '#a91e62', '#0ebfb7', '#e56c1b', '#7f007e'];

    ngOnChanges(changes: SimpleChanges) {
        console.log('changes', changes);
    }
}
