import {Component, Input, OnInit} from '@angular/core';
import {PoolRowAdapter} from '../../model/pool-row-adapter';
import {ResourceBarComponent} from "./resource-bar/resource-bar.component";
import {MatGridList, MatGridTile} from "@angular/material/grid-list";

@Component({
    selector: 'crczp-pool-expand-detail',
    templateUrl: './pool-expand-detail.component.html',
    styleUrls: ['./pool-expand-detail.component.css'],
    imports: [
        ResourceBarComponent,
        MatGridTile,
        MatGridList
    ]
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
