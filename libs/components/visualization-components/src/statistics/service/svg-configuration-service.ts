import * as d3 from 'd3';
import {Injectable} from '@angular/core';

@Injectable()
export class SvgConfigurationService {
    /**
     * Removes all the elements from all the canvases
     * of the specified wrapper element
     * @param placeholderId - marks the wrapper element
     */
    cleanSvgs(placeholderId: string): void {
        d3.select(placeholderId).selectAll('svg').selectAll('*').remove();
    }

    /**
     * Sets the height of the mat-card-content element
     * based on the current height of the mat-card element
     * @param chartId - marks the wrapper element of mat-card element
     */
    setMatContentHeight(chartId: string): void {
        // Gets the height of the mat-card element
        // .slice(0, -2) removes 'px' from the returned value
        const cardHeight = Number(d3.select(chartId).select('mat-card').style('height').slice(0, -2));
        // Gets the height of the mat-card-title element
        // Adds the padding and margin (24) to the actual height
        const titleHeight: number =
            Number(d3.select(chartId).select('mat-card-title').style('height').slice(0, -2)) + 24;
        // Sets the height of the mat-card-content element
        d3.select(chartId)
            .select('mat-card-content')
            .style('height', cardHeight - titleHeight + 'px');
    }

    /**
     * Converts the current mouse position - which is given by the
     * coordinates of the screen - into coordinates of the selected canvas
     * @param svgId - marks the selected canvas
     * @param screenX - defines the x coordinate of the current mouse position
     * @param screenY - defines the y coordinate of the current mouse position
     */
    convertScreenCoordToSvgCoord(svgId: string, screenX: number, screenY: number): { x: number; y: number } {
        const svg: any = document.getElementById(svgId);
        const pt: any = svg.createSVGPoint();
        pt.x = screenX;
        pt.y = screenY;
        const svgP: any = pt.matrixTransform(svg.getScreenCTM().inverse());
        return {
            x: svgP.x,
            y: svgP.y,
        };
    }

    /**
     * Makes the canvas responsive to the size of the window
     * The placeholder element is responsive to the screen size,
     * so function 'resizeSvg' sets the size and viewbox of the
     * selected canvas based on the size of the placeholder element,
     * then returns the actual width and height, which can be later saved
     * If more wrappers are specified, this function can set the size for
     * all of the canvases -> every svg will have the same height
     * @param placeholderIds - contains the IDs of the wrapper elements
     */
    resizeSvg(placeholderIds: string[]): { widths: number[]; height: number } {
        const actualWidths: number[] = [];
        let actualHeight: number;
        for (let i = 0; i < placeholderIds.length; i++) {
            // Gets the size of the placeholder
            const size: {
                width: number;
                height: number;
            } = this.getPlaceholderSize(placeholderIds[i]);
            // Selects the canvas and resizes it
            const canvas: d3.Selection<d3.BaseType, unknown, HTMLElement, any> = d3
                .select(placeholderIds[i])
                .select('svg');
            this.setSvgSize(canvas, size.width, size.height);
            // Saves the actual width and height of the placeholder,
            // so its size can be returned
            actualWidths.push(size.width);
            actualHeight = size.height;
        }
        return { widths: actualWidths, height: actualHeight };
    }

    /**
     * Gets the size of the placeholder element and returns it
     * @param placeholderId - marks the ID of the placeholder element
     */
    private getPlaceholderSize(placeholderId: string): { width: number; height: number } {
        const placeholderSize: DOMRect | ClientRect = (<HTMLElement>(
            d3.select(placeholderId).node()
        )).getBoundingClientRect();
        return {
            width: placeholderSize.width,
            height: Math.round(0.92 * placeholderSize.height),
        };
    }

    /**
     * Sets the width, height and the viewbox attributes of the canvas
     * so it is responsive to the window size
     * @param canvas - marks the svg element for which the size is set
     * @param width - defines the new width of the canvas
     * @param height - specifies the new height of the canvas
     */
    private setSvgSize(
        canvas: d3.Selection<d3.BaseType, unknown, HTMLElement, any>,
        width: number,
        height: number,
    ): void {
        canvas
            .attr('width', width)
            .attr('height', height)
            .attr('viewbox', '0 0 ' + width + ' ' + height);
    }
}
