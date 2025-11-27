import * as d3 from 'd3';
import {Injectable} from '@angular/core';

@Injectable()
export class TooltipCreationService {
    /**
     * Based on the input parameters creates a rectangle which
     * represents the tooltip -> it will contain the text
     * @param placeholderId - marks the element to which the tooltip is appended
     * @param className - attaches a class to the tooltip
     * @param x - marks the x coordinate of the rectangle
     * @param y - marks the y coordinate of the rectangle
     * @param width - marks the width of the rectangle
     * @param height - marks the height of the rectangle
     * @param color - specifies the background color for the rectangle
     */
    createTooltipRect(
        placeholderId: string,
        className: string,
        x: number,
        y: number,
        width: number,
        height: number,
        color?: string,
    ): void {
        if (color === undefined) {
            color = '#000000';
        }
        d3.select(placeholderId)
            .append('rect')
            .attr('class', className)
            .attr('x', x)
            .attr('y', y)
            .attr('width', width)
            .attr('height', height)
            .attr('rx', 5)
            .attr('ry', 5)
            .style('fill', color)
            .style('opacity', 0.7)
            .style('stroke', color)
            .style('stroke-width', 1);
    }

    /**
     * Appends text based on the input parameters to the tooltip
     * Multiple lines of text can be attached at once -> each
     * element of the arrays represents the parameters for one line
     * @param placeholderId - marks the element to which the text is appended
     * @param className - each text element is marked by a class
     * @param x - marks the x coordinate of the tspan element
     * @param y - marks the y coordinate of the tspan element
     * @param fontSize - defines the size of the text
     * @param text - each element represents one row of the tooltip text
     * @param yShift - marks the shift between the y coordinate of the tspan
     *                 element and the current line of text
     * @param color - defines the color of the text
     */
    addTooltipText(
        placeholderId: string,
        className: string,
        x: number,
        y: number,
        fontSize: number,
        text: string[],
        yShift: number[],
        color?: string,
    ): void {
        if (color === undefined) {
            color = '#ffffff';
        }
        // Creates the main text element which contains the tspan elements
        // Each tspan element represents one line of the text
        const basicTextElement: d3.Selection<SVGTextElement, unknown, HTMLElement, any> = d3
            .select(placeholderId)
            .append('text')
            .attr('class', className)
            .attr('x', x)
            .attr('y', y)
            .attr('dy', 0)
            .style('text-anchor', 'middle')
            .style('font-size', fontSize)
            .style('fill', color);
        // Adds the text lines
        for (let i = 0; i < text.length; i++) {
            basicTextElement
                .append('tspan')
                .attr('class', placeholderId)
                .attr('x', x)
                .attr('dy', yShift[i])
                .text(text[i]);
        }
    }

    /**
     * Based on the size of the wrapper element calculates
     * the font size for the tooltip text
     * @param element - marks the wrapper element
     */
    getTooltipFontSize(element: string): number {
        // Defines the biggest font size which can be used (in px)
        const maxFontSize = 14;
        const rate = 0.018;
        const elementWidth = Number(d3.select(element).select('mat-card').style('width').slice(0, -2));
        return rate * elementWidth > maxFontSize ? maxFontSize : rate * elementWidth;
    }

    /**
     * The size of the tooltip rectangle can be set manually
     * or based on the placeholder's size
     * Calculates the size of the tooltip based on the
     * wrapper elemets width
     * @param chartWidth - marks the wrapper element/canvas
     */
    getTooltipSize(chartWidth: number): { width: number; height: number } {
        const width: number = Math.round(0.2 * chartWidth);
        const height: number = Math.round(0.7 * width);
        return { width: width, height: height };
    }
}
