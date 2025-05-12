import * as d3 from 'd3';
import { Injectable } from '@angular/core';

@Injectable()
export class LegendCreationService {
    /**
     * Attaches rectangles (based on the input parameters) to the legend,
     * which represent the individual colors used while creating the chart
     * Several rectangles can be appended at once -> the parameters that can
     * differ from rectangle to rectangle are represented by arrays -> the
     * length of the arrays indicates the number of rectangles to be attached
     * @param placeholder - marks the wrapper element to which
     *                      the rectangles should be appended
     * @param className - each rectangle can be marked by a class
     * @param color - represents the colors of the rectangles
     * @param x - marks the x coordinates of the rectangles
     * @param y - marks the y coordinates of the rectangles
     * @param width - marks the widths of the rectangles
     * @param height - marks the heights of the rectangles
     * @param opacity - marks the opacities of the rectangles
     */
    createLegendRect(
        placeholder: string,
        className: string,
        color: string[],
        x: number,
        y: number[],
        width: number,
        height: number,
        opacity: number[],
    ): void {
        for (let i = 0; i < y.length; i++) {
            d3.select(placeholder)
                .append('rect')
                .attr('class', className)
                .attr('x', x)
                .attr('y', y[i])
                .attr('width', width)
                .attr('height', height)
                .style('fill', color[i])
                .style('opacity', opacity[i]);
        }
    }

    /**
     * Enables to append multiple rows of text to the rectangles of the legend
     * The parameters which differ for the individual rows are represented by
     * arrays -> their length indicates the number of lines and it should be the same
     * @param placeholderId - marks the wrapper element to which the text is appended
     * @param className - each text can be marked by a class
     * @param x - marks the x coordinate of the main 'tspan' element
     * @param y - marks the y coordinate of the main 'tspan' element
     * @param fontSize - defines the size of the text
     * @param color - defines the color of the text
     * @param text - each element of the array represents one line of the text
     * @param xShift - each element represents the shift between the x coordinate
     *                 of the tspan element and the current row
     * @param yShift - each element represents the shift between the y coordinate
     *                 of the tspan element and the current row
     * @param textAnchor - if defined, marks the anchor of the text
     */
    addLegendText(
        placeholderId: string,
        className: string,
        x: number,
        y: number,
        fontSize: number,
        color: string,
        text: string[],
        xShift: number[],
        yShift: number[],
        textAnchor?: string,
    ): void {
        textAnchor = textAnchor == undefined ? 'middle' : textAnchor;
        // Creates the main text element which contains the tspan elements
        // Each tspan element represents one line of the text
        const basicTextElement: d3.Selection<SVGTextElement, unknown, HTMLElement, any> = d3
            .select(placeholderId)
            .append('text')
            .attr('class', className)
            .attr('x', x)
            .attr('y', y)
            .attr('dy', 0)
            .style('text-anchor', textAnchor)
            .style('font-size', fontSize)
            .style('fill', color);
        // Adds the text lines
        for (let i = 0; i < text.length; i++) {
            basicTextElement
                .append('tspan')
                .attr('class', placeholderId.slice(1, placeholderId.length))
                .attr('x', x + xShift[i])
                .attr('dy', yShift[i])
                .text(text[i]);
        }
    }

    /**
     * Based on the size of the wrapper element, calculates
     * the font size for the legend elements
     * @param element - marks the wrapper element
     */
    getLegendFontSize(element: string): number {
        const maxFontSize = 14;
        const rate = 0.018;
        const elementWidth = Number(
            (d3.select(element).select('mat-card').node() as any).getBoundingClientRect().width,
        );
        return rate * elementWidth > maxFontSize ? maxFontSize : rate * elementWidth;
    }
}
