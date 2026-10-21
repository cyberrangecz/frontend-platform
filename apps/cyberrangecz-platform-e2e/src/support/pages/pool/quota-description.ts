interface Quota {
    limit: number;
    in_use: number;
}

/** The resources response of the sandbox service that the quota charts are drawn from. */
export interface ResourcesPayload {
    project_name: string;
    quotas: Record<'instances' | 'vcpu' | 'ram' | 'port' | 'network', Quota>;
}

const QUOTA_CHARTS = [
    { key: 'instances', name: 'Instances', unit: '' },
    { key: 'vcpu', name: 'VCPUs', unit: '' },
    { key: 'ram', name: 'RAM', unit: 'GB' },
    { key: 'port', name: 'Ports', unit: '' },
    { key: 'network', name: 'Networks', unit: '' },
] as const;

/** Describes the quota donut charts of the pool overview, in the order they are drawn. */
export function describeQuotaCharts(resources: ResourcesPayload): string {
    const charts = QUOTA_CHARTS.map(({ key, name, unit }) => {
        const { in_use: inUse, limit } = resources.quotas[key];
        return `${name} ${((inUse / limit) * 100).toFixed(1)}% in the centre and '${inUse}${unit} of ${limit}${unit}' below`;
    });
    return `Resource quota panel headed '${resources.project_name}' with 5 donut charts in this order: ${charts.join('; ')}`;
}
