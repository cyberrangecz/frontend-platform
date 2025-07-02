import {Injectable} from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class FilteringService {
    constructor() {}

    filter(trainingDataSet: any[], selectedFilterValue): any[] {
        let filteredTrainingDataSet: any[];

        switch (selectedFilterValue) {
            case 1:
                filteredTrainingDataSet = trainingDataSet;
                break;
            case 2:
                filteredTrainingDataSet = this.filterByFinished(trainingDataSet, true);
                break;
            case 3:
                filteredTrainingDataSet = this.filterByFinished(trainingDataSet, false);
                break;
        }

        return filteredTrainingDataSet;
    }

    filterByFinished(trainingDataSet: any[], byFinished: boolean): any[] {
        let filtered: any[] = [];
        if (typeof trainingDataSet !== 'undefined') {
            filtered = trainingDataSet.filter(function (d: any): boolean {
                return (d.currentState === 'FINISHED') === byFinished;
            });
        }

        return filtered;
    }
}
