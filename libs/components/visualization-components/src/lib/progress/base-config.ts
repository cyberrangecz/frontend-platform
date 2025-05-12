import { PlanData } from './plan-config';

export class Padding {
    top: number;
    bottom: number;
}

export class BaseConfig {
    data: PlanData;
    element: string;
    outerWrapperElement: string;
    time: number;
    padding: Padding;
    minBarHeight: number;
    maxBarHeight: number;
    estimatedTime: number;
}
