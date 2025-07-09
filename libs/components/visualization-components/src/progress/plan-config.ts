
export class PlanData {
    keys: string[];
    teams: Record<string, number>[];
}

export class PlanConfig {
    data: PlanData;
    time: number;
    estimatedTime: number;
}
