import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatTab, MatTabContent, MatTabGroup} from "@angular/material/tabs";
import {TopologyGraph} from "./topology-graph/topology-graph";
import {MatTooltip} from "@angular/material/tooltip";
import {ConsoleTab} from "../model/model";
import {GraphNode, GraphNodeLink, GraphNodeType} from "@crczp/sandbox-model";

@Component({
    selector: 'topology-component',
    imports: [CommonModule, MatTab, MatTabGroup, MatTabContent, TopologyGraph, MatTooltip],
    templateUrl: './topology-component.html',
    styleUrl: './topology-component.scss',
})
export class TopologyComponent {

    selectedIndex = signal(0);
    presetNodes: GraphNode[] = [
        {name: 'CoreRouter', nodePorts: [], nodeType: GraphNodeType.Internet},
        {name: 'DistSwitch 1', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'DistSwitch 2', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'AccessSwitch 1', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'AccessSwitch 2', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'AccessSwitch 3', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'AccessSwitch 4', nodePorts: [], nodeType: GraphNodeType.Switch},
        {name: 'Server 1', nodePorts: [], nodeType: GraphNodeType.Cloud},
        {name: 'Server 2', nodePorts: [], nodeType: GraphNodeType.Cloud},
        {name: 'Device 1', nodePorts: [], nodeType: GraphNodeType.Desktop},
        {name: 'Device 2', nodePorts: [], nodeType: GraphNodeType.Desktop},
        {name: 'Device 3', nodePorts: [], nodeType: GraphNodeType.Desktop},
        {name: 'Device 4', nodePorts: [], nodeType: GraphNodeType.Desktop},
        {name: 'Device 5', nodePorts: [], nodeType: GraphNodeType.Desktop},
        {name: 'Device 6', nodePorts: [], nodeType: GraphNodeType.Desktop}
    ]
    presetLinks: GraphNodeLink[] = [
        // Core to Distribution
        {id: 1, source: this.presetNodes[0], target: this.presetNodes[1]}, // CoreRouter -> DistSwitch1
        {id: 2, source: this.presetNodes[0], target: this.presetNodes[2]}, // CoreRouter -> DistSwitch2

        // Dist1 to Access + Server
        {id: 3, source: this.presetNodes[1], target: this.presetNodes[3]}, // DistSwitch1 -> AccessSwitch1
        {id: 4, source: this.presetNodes[1], target: this.presetNodes[4]}, // DistSwitch1 -> AccessSwitch2
        {id: 5, source: this.presetNodes[1], target: this.presetNodes[7]}, // DistSwitch1 -> Server1

        // Dist2 to Access + Server
        {id: 6, source: this.presetNodes[2], target: this.presetNodes[5]}, // DistSwitch2 -> AccessSwitch3
        {id: 7, source: this.presetNodes[2], target: this.presetNodes[6]}, // DistSwitch2 -> AccessSwitch4
        {id: 8, source: this.presetNodes[2], target: this.presetNodes[8]}, // DistSwitch2 -> Server2

        // Access1 to Devices
        {id: 9, source: this.presetNodes[3], target: this.presetNodes[9]},  // AccessSwitch1 -> DeviceA1
        {id: 10, source: this.presetNodes[3], target: this.presetNodes[10]}, // AccessSwitch1 -> DeviceA2

        // Access2 to Devices
        {id: 11, source: this.presetNodes[4], target: this.presetNodes[11]}, // AccessSwitch2 -> DeviceA3
        {id: 12, source: this.presetNodes[4], target: this.presetNodes[12]}, // AccessSwitch2 -> DeviceA4

        // Access3 to Devices
        {id: 13, source: this.presetNodes[5], target: this.presetNodes[13]}, // AccessSwitch3 -> DeviceA5
        {id: 14, source: this.presetNodes[5], target: this.presetNodes[14]}, // AccessSwitch3 -> DeviceA6
    ];
    protected tabs = signal<ConsoleTab[]>([
        {
            title: "Attacker",
            ip: "127.0.0.1",
        }
    ])

    handleOpenConsole($event: ConsoleTab) {

    }
}
