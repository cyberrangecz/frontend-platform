import { ChangeDetectionStrategy, Component, ElementRef, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { UserData } from '../../../../model/user-data';
import { AbsolutePositionService } from '../../../../services/absolute-position.service';

@Component({
    // eslint-disable-next-line @angular-eslint/component-selector
    selector: 'g[success-axis]',
    template: '',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuccessAxisComponent implements OnInit {
    private g: any;

    @Input() userData!: UserData[];

    constructor(
        element: ElementRef,
        private absolutePositionService: AbsolutePositionService,
    ) {
        this.g = d3.select(element.nativeElement);
    }

    ngOnInit(): void {
        this.createGradient();
        this.drawSuccessRectangle();
    }

    private createGradient() {
        const gradient = this.g.append('defs').append('linearGradient');
        gradient.attr('id', 'successGradient').attr('gradientTransform', 'rotate(90)');
        const userPoints = this.userData.map((user) => user.points);
        const min = Math.min(...userPoints);
        const max = Math.max(...userPoints);
        gradient.append('stop').attr('offset', '0%').attr('stop-color', `rgb(0, 256, 0)`);
        for (let i = 1; i < this.userData.length; i++) {
            // create gradient for every two adjacent sorted users
            const yPositionFrom = this.getPositionOfUser(i - 1);
            const yPositionTo = this.getPositionOfUser(i);
            const percentFrom = this.getRelativePercent(min, max, i - 1);
            const percentTo = this.getRelativePercent(min, max, i);
            gradient
                .append('stop')
                .attr('offset', Math.round(yPositionFrom) + '%')
                .attr('stop-color', `rgb(${percentFrom * 2.56},${(100 - percentFrom) * 2.56},0)`);
            gradient
                .append('stop')
                .attr('offset', Math.round(yPositionTo) + '%')
                .attr('stop-color', `rgb(${percentTo * 2.56},${(100 - percentTo) * 2.56},0)`);
        }
        gradient.append('stop').attr('offset', '100%').attr('stop-color', `rgb(256, 0, 0)`);
    }

    private getRelativePercent(min: number, max: number, userId: number): number {
        return 100 * ((this.userData[userId].points - min) / (max - min));
    }

    private getPositionOfUser(userId: number): number {
        return (
            (100 * this.absolutePositionService.getFinalYPositionOfUser(userId, this.userData[userId])) /
            this.absolutePositionService.getSvgHeight()
        );
    }

    private drawSuccessRectangle() {
        this.g
            .append('rect')
            .attr('class', 'axis')
            .attr('height', this.absolutePositionService.getAbsoluteY(100))
            .attr('width', '20px')
            .attr('x', this.absolutePositionService.getAbsoluteX(100) - 10)
            .attr('y', '0%')
            .style('fill', 'url(#successGradient)');
    }
}
