import { Injectable } from '@angular/core';
import { WalkthroughVisualizationData } from '../model/walkthrough-visualization-data';
import { UserData } from '../model/user-data';

@Injectable()
export class AbsolutePositionService {
    public svgWidth!: number;
    public svgHeight!: number;
    public data!: WalkthroughVisualizationData;

    getAbsoluteX(relative: number): number {
        return (relative / 100) * this.svgWidth;
    }

    getAbsoluteY(relative: number): number {
        return (relative / 100) * this.svgHeight;
    }

    getAxesCount(): number {
        return Math.max(...this.data.usersData.map((value) => value.events.length));
    }

    getRelativeXPositionOfEvent(index: number, axesCount: number): number {
        return index * (100 / (axesCount - 1));
    }

    getStartYPositionOfUser(index: number) {
        return 50 + 40 * index;
    }

    getYPositionOfUserEvent(indexOfUser: number, indexOfEvent: number, userData: UserData): number {
        let absoluteYPosition = this.getStartYPositionOfUser(indexOfUser);
        userData.events.forEach((userEvent, index) => {
            if (index <= indexOfEvent) {
                absoluteYPosition += userEvent.points;
            }
        });
        return absoluteYPosition;
    }

    getFinalYPositionOfUser(indexOfUser: number, userData: UserData): number {
        return this.getYPositionOfUserEvent(indexOfUser, userData.events.length - 1, userData);
    }

    getMaxYPositionOfUser(indexOfUser: number, numberOfUsers: number) {
        return this.svgHeight - 30 * (numberOfUsers - indexOfUser - 1) - 10;
    }

    getSvgHeight(): number {
        return this.svgHeight;
    }
}
