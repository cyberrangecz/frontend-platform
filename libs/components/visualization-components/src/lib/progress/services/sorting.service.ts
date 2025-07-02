import {Injectable} from '@angular/core';
import {PlanDataEntry, ProgressLevelInfo} from '@crczp/visualization-model';

export type SortOrder = 'asc' | 'desc';

@Injectable()
export class SortingService {
    private levels: ProgressLevelInfo[]

    sort(
        trainingdataset: PlanDataEntry[],
        sortReverse: boolean,
        sortType: string,
        sortLevel: number,
        levels: ProgressLevelInfo[]
    ): any[] {

        let sortedTrainingdataset: PlanDataEntry[];
        const order: SortOrder = sortReverse ? 'desc' : 'asc';

        this.levels = levels;

        switch (sortType) {
            case 'name':
                sortedTrainingdataset = this.sortByName(trainingdataset, order);
                break;
            case 'time':
                sortedTrainingdataset = this.sortByNumericProperty('totalTime', trainingdataset, order);
                break;
            case 'level':
                sortedTrainingdataset = this.sortByLevelTime(trainingdataset, sortLevel, order);
                break;
            case 'active-level':
                sortedTrainingdataset = this.sortByActiveLevelTime(trainingdataset, sortLevel, order);
                break;
            case 'hints':
                sortedTrainingdataset = this.sortByNumericProperty('hints', trainingdataset, order);
                break;
            case 'score':
                sortedTrainingdataset = this.sortByNumericProperty('score', trainingdataset, order);
                break;
            case 'answers':
                sortedTrainingdataset = this.sortByNumericProperty('answers', trainingdataset, order);
                break;
        }

        return sortedTrainingdataset;
    }

    sortByNumericProperty(property, trainingdataset: any[], order: SortOrder): any[] {
        let sorted: any[] = [];
        if (typeof trainingdataset !== 'undefined') {
            sorted = trainingdataset.slice(0);
            sorted.sort(
                function(teamA: any, teamB: any): number {
                    if (order === 'desc') return this.d3.descending(teamA[property], teamB[property]);
                    else return this.d3.ascending(teamA[property], teamB[property]);
                }.bind(this)
            );
        }
        return sorted;
    }

    sortByLevelTime(trainingdataset: any[], level: number, order: SortOrder): any[] {
        let finishedLevel,
            currentlyInLevel,
            notYetInLevel: any[] = [];
        if (typeof trainingdataset !== 'undefined') {
            finishedLevel = trainingdataset.slice(0).filter((team) => typeof team['level' + level] !== 'undefined');

            currentlyInLevel = trainingdataset
                .slice(0)
                .filter(
                    (team) => typeof team['level' + level] === 'undefined' && team['currentState'] === 'level' + level
                );

            notYetInLevel = trainingdataset
                .slice(0)
                .filter(
                    (team) => typeof team['level' + level] === 'undefined' && team['currentState'] !== 'level' + level
                );

            finishedLevel.sort(
                function(teamA: any, teamB: any): number {
                    let timeA, timeB: number;
                    if (typeof teamA['level' + level] !== 'undefined') {
                        timeA = teamA['level' + level];
                    } else {
                        timeA = teamA.totalTime;
                    }
                    if (typeof teamB['level' + level] !== 'undefined') {
                        timeB = teamB['level' + level];
                    } else {
                        timeB = teamB.totalTime;
                    }
                    if (order === 'desc') return this.d3.descending(timeA, timeB);
                    else return this.d3.ascending(timeA, timeB);
                }.bind(this)
            );
        }

        return notYetInLevel.concat(currentlyInLevel.concat(finishedLevel));
    }

    sortByActiveLevelTime(trainingdataset: any[], level: number, order: SortOrder): any[] {
        let finishedLevel,
            currentlyInLevel,
            notYetInLevel: any[] = [];
        if (typeof trainingdataset !== 'undefined') {
            finishedLevel = trainingdataset.slice(0).filter((team) => typeof team['level' + level] !== 'undefined');

            currentlyInLevel = trainingdataset
                .slice(0)
                .filter(
                    (team) => typeof team['level' + level] === 'undefined' && team['currentState'] === 'level' + level
                );

            notYetInLevel = trainingdataset
                .slice(0)
                .filter(
                    (team) => typeof team['level' + level] === 'undefined' && team['currentState'] !== 'level' + level
                );

            currentlyInLevel.sort((a, b) => {
                let suma = 0;

                this.levels.forEach((level) => {
                    const levelTime = a['level' + (level.order + 1)];
                    suma += levelTime ? levelTime : 0;
                });

                let sumb = 0;

                this.levels.forEach((level) => {
                    const levelTime = b['level' + (level.order + 1)];
                    sumb += levelTime ? levelTime : 0;
                });

                return order == 'asc'
                    ? b.totalTime - sumb - (a.totalTime - suma)
                    : a.totalTime - suma - (b.totalTime - sumb);
            });
        }

        return notYetInLevel.concat(currentlyInLevel.concat(finishedLevel));
    }

    sortByName(trainingDataset: PlanDataEntry[], order: SortOrder): PlanDataEntry[] {
        let sorted: PlanDataEntry[] = [];
        if (typeof trainingDataset !== 'undefined') {
            sorted = trainingDataset.slice(0);
            sorted.sort(
                function(teamA: any, teamB: any): number {
                    const nameA: string = String(teamA.traineeName).toLowerCase(),
                        nameB: string = String(teamB.traineeName).toLowerCase();
                    const compared: boolean = order === 'asc' ? nameA > nameB : nameA < nameB;
                    return 0 - (compared ? 1 : -1);
                }.bind(this)
            );
        }

        return sorted;
    }
}
