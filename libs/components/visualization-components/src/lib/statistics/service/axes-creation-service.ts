import * as d3 from 'd3';
import {Injectable} from '@angular/core';

@Injectable()
export class AxesCreationService {
    /**
     * Attaches the x and y axes defined by the input parameters
     * to the selected canvases of the components
     * In case multiple axes are defined (e.g. for combined diagram),
     * attaches the second axis to the canvas, too
     * @param xCanvasId - marks the ID of the canvas
     *                    to which x axis should be attached
     * @param yCanvasId - marks the ID of the canvas
     *                    to which y axis should be attached
     * @param axisX - defines the x axis
     * @param axisY - defines the y axis
     * @param translateX - specifies the parameters for the
     *                     translate function applied to the x axis
     * @param translateY - specifies the parameters for the
     *                     translate function applied to the y axis
     * @param fontSize - marks the font size used for the ticks
     * @param multipleAxisCanvasId - marks the ID of the canvas to which
     *                               the second axis should be attached,
     *                               in case it exists
     * @param multipleAxis - marks the second axis, if it exists
     */
    callAxes(
        xCanvasId: string,
        yCanvasId: string,
        axisX: any,
        axisY: any,
        translateX: string,
        translateY: string,
        fontSize: number,
        multipleAxisCanvasId?: string,
        multipleAxis?: any,
    ): void {
        d3.select(xCanvasId)
            .append('g')
            .attr('transform', 'translate(' + translateX + ')')
            .call(axisX)
            .attr('id', 'xAxis')
            .selectAll('text')
            .style('font-size', fontSize);

        d3.select(yCanvasId)
            .append('g')
            .attr('transform', 'translate(' + translateY + ')')
            .call(axisY)
            .selectAll('text')
            .style('font-size', fontSize);

        // Multiple axis is used only in case of composed diagram,
        // so the translate function does not have to be parametrized, yet
        if (multipleAxisCanvasId !== undefined) {
            d3.select(multipleAxisCanvasId)
                .append('g')
                .attr('transform', 'translate(0, 0)')
                .call(multipleAxis)
                .selectAll('text')
                .style('font-size', fontSize);
        }
    }

    /**
     * Creates a title for the x axis based on the input parameters
     * @param canvasId - marks the canvas to which the title should be attached
     * @param x - defines the x coordinate of the title
     * @param y - defines the y coordinate of the title
     * @param text - specifies the title's text
     * @param fontSize - marks the size of the text
     * @param textAnchor - if it is defined, marks the anchor of the text,
     *                     otherwise uses the value 'end'
     */
    createXAxesTitle(
        canvasId: string,
        x: number,
        y: number,
        text: string,
        fontSize: number,
        textAnchor?: string,
    ): void {
        textAnchor = textAnchor === undefined ? 'end' : textAnchor;
        d3.select(canvasId)
            .append('text')
            .attr('text-anchor', textAnchor)
            .attr('x', x)
            .attr('y', y + 10)
            .text(text)
            .style('font-size', fontSize);
    }

    /**
     * Creates a title for the y axis based on the input parameters
     * The main difference to the function 'createXAxesTitle' is that
     * this title should be rotated by 90 degrees
     * @param canvasId - marks the canvas to which the title should be attached
     * @param x - defines the x coordinate of the title
     * @param y - defines the y coordinate of the title
     * @param text - specifies the title's text
     * @param fontSize - marks the size of the text
     */
    createYAxesTitle(canvasId: string, x: number, y: number, text: string, fontSize: number): void {
        d3.select(canvasId)
            .append('text')
            .attr('text-anchor', 'end')
            .attr('transform', 'rotate(-90)')
            .attr('x', x)
            .attr('y', y)
            .text(text)
            .style('font-size', fontSize);
    }

    /**
     * Creates an axis with arrows at its end
     * @param svgId - specifies the canvas to which the axis should be attached
     * @param x1 - marks the x coordinate of the 'start' of the axis
     * @param x2 - marks the x coordinate of the 'end' of the axis
     * @param y1 - marks the y coordinate of the 'start' of the axis
     * @param y2 - marks the y coordinate of the 'end' of the axis
     */
    createAxesWithArrow(svgId: string, x1: number, x2: number, y1: number, y2: number): void {
        // Defines the arrow
        d3.select(svgId)
            .append('svg:defs')
            .append('svg:marker')
            .attr('id', 'triangle')
            .attr('refX', 6)
            .attr('refY', 6)
            .attr('markerWidth', 30)
            .attr('markerHeight', 30)
            .attr('markerUnits', 'userSpaceOnUse')
            .attr('orient', 'auto')
            .append('path')
            .attr('d', 'M 0 0 12 6 0 12 3 6')
            .style('fill', 'black');
        // Attaches the line which represents the axis
        d3.select(svgId)
            .append('line')
            .attr('x1', x1)
            .attr('y1', y1)
            .attr('x2', x2)
            .attr('y2', y2)
            .attr('stroke-width', 1)
            .attr('stroke', 'black')
            .attr('marker-end', 'url(#triangle)');
    }

    /**
     * Based on the size of the wrapper element, calculates
     * the font size for the ticks of the axes
     * @param element - marks the wrapper element
     */
    getAxisFontSize(element: string): number {
        // Specifies the biggest font size that can be used (in px)
        const maxFontSize = 14;
        const rate = 0.022;
        const elementWidth = Number(
            (d3.select(element).select('mat-card').node() as any).getBoundingClientRect().width,
        );
        return rate * elementWidth > maxFontSize ? maxFontSize : rate * elementWidth;
    }

    /**
     * Based on the size of the wrapper element, calculates
     * the font size for the titles of the axes
     * @param element - marks the wrapper element
     */
    getAxisTitleFontSize(element: string): number {
        // Specifies the biggest font size that can be used (in px)
        const maxFontSize = 16;
        const rate = 0.025;
        const elementWidth = Number(
            (d3.select(element).select('mat-card').node() as any).getBoundingClientRect().width,
        );
        return rate * elementWidth > maxFontSize ? maxFontSize : rate * elementWidth;
    }
}
