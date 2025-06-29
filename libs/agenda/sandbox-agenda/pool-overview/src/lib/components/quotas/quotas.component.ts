import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {MatCard} from "@angular/material/card";
import {QuotaPieChartComponent} from "./quota-pie-chart/quota-pie-chart.component";
import {NgIf} from "@angular/common";

@Component({
    selector: 'crczp-quotas',
    templateUrl: './quotas.component.html',
    styleUrls: ['./quotas.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        QuotaPieChartComponent,
        NgIf
    ]
})
export class QuotasComponent {
    @Input() resources;

    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
    resourceColors = ['#3D54AF', '#a91e62', '#0ebfb7', '#e56c1b', '#7f007e'];
}
