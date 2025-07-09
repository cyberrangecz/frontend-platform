import {Injectable} from '@angular/core';
import {WalkthroughUserData, WalkthroughVisualizationData} from '@crczp/visualization-model';

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

    getYPositionOfUserEvent(indexOfUser: number, indexOfEvent: number, userData: WalkthroughUserData): number {
        let absoluteYPosition = this.getStartYPositionOfUser(indexOfUser);
        userData.events.forEach((userEvent, index) => {
            if (index <= indexOfEvent) {
                absoluteYPosition += userEvent.points;
            }
        });
        return absoluteYPosition;
    }

    getFinalYPositionOfUser(indexOfUser: number, userData: WalkthroughUserData): number {
        return this.getYPositionOfUserEvent(indexOfUser, userData.events.length - 1, userData);
    }

    getMaxYPositionOfUser(indexOfUser: number, numberOfUsers: number) {
        return this.svgHeight - 30 * (numberOfUsers - indexOfUser - 1) - 10;
    }

    getSvgHeight(): number {
        return this.svgHeight;
    }
}
