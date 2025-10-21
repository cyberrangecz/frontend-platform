export class ChartData {
    used: number;
    free: number;

    constructor(used: number, free: number) {
        this.used = this.roundToTwoDecimalPlaces(used);
        this.free = this.roundToTwoDecimalPlaces(free);
    }

    private roundToTwoDecimalPlaces(value: number): number {
        return Math.round(value * 100) / 100;
    }
}
