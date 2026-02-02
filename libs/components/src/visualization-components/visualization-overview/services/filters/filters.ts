import {correctAnswerFilter} from './correct-answer.filter';
import {wrongAnswerFilter} from './wrong-answer.filter';
import {basicfilter} from './basicfilter';
import {trainingLevelFilter} from './training-level.filter';
import {assessmentLevelFilter} from './assessment-level.filter';
import {infoLevelFilter} from './info-level.filter';
import {hintFilter} from './hint.filter';
import {accessLevelFilter} from './access-level.filter';
import {TimelineEvent} from '../../components/model/timeline/timeline-event';

export interface Filter {
    name: string;
    labelName: string;
    checked: boolean;
    filterFunction: (event: TimelineEvent) => boolean;
}

export type FiltersObject = Record<string, Filter>;

// Add every new filter to this array
export const FILTERS_ARRAY: Filter[] = [
    correctAnswerFilter,
    hintFilter,
    wrongAnswerFilter,
    trainingLevelFilter,
    assessmentLevelFilter,
    infoLevelFilter,
    accessLevelFilter,
    basicfilter,
];

export const FILTERS_OBJECT: FiltersObject = getFiltersObject(FILTERS_ARRAY);

export function getFiltersObject(filtersArray: Filter[]): FiltersObject {
    const resultObject: FiltersObject = {} as FiltersObject;
    filtersArray.forEach((filter) => {
        Object.defineProperty(resultObject, filter.name, {
            value: filter,
            writable: false,
            enumerable: true,
        }); // allows using Object.keys on result object (needed in ScoreProgressComponent.filterEvents())
    });
    return resultObject;
}
