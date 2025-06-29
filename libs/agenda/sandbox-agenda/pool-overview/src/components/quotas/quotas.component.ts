import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
    selector: 'crczp-quotas',
    templateUrl: './quotas.component.html',
    styleUrls: ['./quotas.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuotasComponent {
    @Input() resources;

    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
    resourceColors = ['#3D54AF', '#a91e62', '#0ebfb7', '#e56c1b', '#7f007e'];
}
