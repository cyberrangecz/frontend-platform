import { TopologyGraphConfig } from '@crczp/topology-graph';

export class SandboxAgendaConfig {
    pollingPeriod: number;
    retryAttempts: number;
    defaultPaginationSize: number;
    topologyConfig: TopologyGraphConfig;
}
