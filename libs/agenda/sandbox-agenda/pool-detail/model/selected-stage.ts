export class SelectedStage {
    unitId: number;
    state: string;
    order: number;

    constructor(unitId: number, state: string, order: number) {
        this.unitId = unitId;
        this.state = state;
        this.order = order;
    }
}
