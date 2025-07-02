import {Component, Input, OnChanges, OnInit} from '@angular/core';
import {ICONS_PATH} from '../icons-path';
import {CommonModule} from '@angular/common';

@Component({
    selector: 'crczp-topology-app-legend',
    templateUrl: './topology-legend.component.html',
    styleUrls: ['./topology-legend.component.css'],
    imports: [CommonModule]
})
export class TopologyLegendComponent implements OnInit, OnChanges {
    @Input() width: number;
    @Input() height: number;
    @Input() legendAttachment: string = 'horizontal';
    @Input() showContainers = false;

    iconsPath = ICONS_PATH;
    iconsMargin: string;

    nodeNames = [
        { icon: 'desktop', name: 'Host' },
        { icon: 'router', name: 'Router' },
        { icon: 'switch', name: 'Switch' },
        { icon: 'cloud', name: 'Hidden subnet' },
        { icon: 'internet', name: 'Internet' },
    ];

    ngOnInit(): void {
        this.setIconsFloating();
    }

    ngOnChanges() {
        this.addContainersIcon();
    }

    setIconsFloating(): void {
        if (this.legendAttachment === 'vertical') {
            this.iconsMargin = '10px 0 0 0';
        } else {
            this.iconsMargin = '0 15px 0 0';
        }
    }

    addContainersIcon() {
        if (this.showContainers) {
            this.nodeNames.push({ icon: 'docker', name: 'Docker container' });
        }
    }
}
