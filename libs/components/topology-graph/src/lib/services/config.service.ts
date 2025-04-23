import { Injectable } from '@angular/core';
import { TopologyGraphConfig } from '../others/topology-graph-config';

/**
 * Global service for storing and accessing configuration of the topology
 */
@Injectable()
export class ConfigService {
    config: TopologyGraphConfig;

    constructor(configurationFile: TopologyGraphConfig) {
        this.config = configurationFile;
    }
}
