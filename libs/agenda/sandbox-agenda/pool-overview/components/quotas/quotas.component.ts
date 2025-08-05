import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { QuotaPieChartComponent } from './quota-pie-chart/quota-pie-chart.component';
import { Resources } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
    selector: 'crczp-quotas',
    templateUrl: './quotas.component.html',
    styleUrls: ['./quotas.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [QuotaPieChartComponent, AsyncPipe],
})
export class QuotasComponent {
    @Input() resources: Observable<Resources>;
    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
    resourceColors = ['#3D54AF', '#a91e62', '#0ebfb7', '#e56c1b', '#7f007e'];
    protected readonly Resources = Resources;
}
