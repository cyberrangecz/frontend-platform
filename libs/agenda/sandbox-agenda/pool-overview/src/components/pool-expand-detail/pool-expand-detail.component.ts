import { Component, Input, OnInit } from '@angular/core';
import { PoolRowAdapter } from 'libs/agenda/sandbox-agenda/pool-overview/src/model/pool-row-adapter';

@Component({
    selector: 'crczp-pool-expand-detail',
    templateUrl: './pool-expand-detail.component.html',
    styleUrls: ['./pool-expand-detail.component.css'],
})
export class PoolExpandDetailComponent implements OnInit {
    @Input() data: PoolRowAdapter;

    displayedResources = ['instances', 'vcpu', 'ram', 'port', 'network'];
    resourceColors = ['#3D54AF', '#a91e62', '#0ebfb7', '#e56c1b', '#7f007e'];
    detailHeight = '120';

    ngOnInit(): void {
        this.detailHeight = this.data.usedSize > 0 ? '120' : '30';
    }
}
