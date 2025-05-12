import { correctAnswerFilter } from './correct-answer.filter';
import { wrongAnswerFilter } from './wrong-answer.filter';
import { basicfilter } from './basicfilter';
import { trainingLevelFilter } from './training-level.filter';
import { assessmentLevelFilter } from './assessment-level.filter';
import { infoLevelFilter } from './info-level.filter';
import { hintFilter } from './hint.filter';
import { accessLevelFilter } from './access-level.filter';

// Add every new filter to this array
export const FILTERS_ARRAY = [
    correctAnswerFilter,
    hintFilter,
    wrongAnswerFilter,
    trainingLevelFilter,
    assessmentLevelFilter,
    infoLevelFilter,
    accessLevelFilter,
    basicfilter,
];

export const FILTERS_OBJECT = getFiltersObject(FILTERS_ARRAY);

export function getFiltersObject(filtersArray) {
    const resultObject = {};
    filtersArray.forEach((filter) => {
        Object.defineProperty(resultObject, filter.name, {
            value: filter,
            writable: false,
            enumerable: true,
        }); // allows using Object.keys on result object (needed in ScoreProgressComponent.filterEvents())
    });
    return resultObject;
}
