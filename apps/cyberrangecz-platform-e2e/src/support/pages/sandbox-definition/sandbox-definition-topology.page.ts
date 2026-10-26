import type { Locator, Page } from '@playwright/test';
import { waitForPageReady } from '../../ui';

/** The topology page of a sandbox definition at `/sandbox-definition/:definitionId/topology`. */
export class SandboxDefinitionTopologyPage {
    readonly wrapper: Locator;
    /** The vis-network canvas that draws the topology. */
    readonly canvas: Locator;
    /** Marks the graph container once the layout settled and the graph is shown. */
    readonly stabilizedGraph: Locator;
    readonly tabs: Locator;
    readonly unavailableMessage: Locator;

    constructor(readonly page: Page) {
        this.wrapper = page.locator('crczp-topology-wrapper');
        this.canvas = this.wrapper.locator('crczp-topology-graph canvas');
        this.stabilizedGraph = this.wrapper.locator('crczp-topology-graph .graph-stabilized');
        this.tabs = this.wrapper.getByRole('tab');
        this.unavailableMessage = page.getByText('Topology unavailable');
    }

    static pathOf(definitionId: number): string {
        return `/sandbox-definition/${definitionId}/topology`;
    }

    async open(definitionId: number): Promise<void> {
        await this.page.goto(SandboxDefinitionTopologyPage.pathOf(definitionId), { waitUntil: 'commit' });
        await waitForPageReady(this.page);
    }

    /** Whether the canvas holds more than one distinct pixel value, so something was drawn on it. */
    async hasDrawnContent(): Promise<boolean> {
        return this.canvas.evaluate((canvas: HTMLCanvasElement) => {
            const context = canvas.getContext('2d');
            if (!context || canvas.width === 0 || canvas.height === 0) {
                return false;
            }
            const pixels = new Uint32Array(
                context.getImageData(0, 0, canvas.width, canvas.height).data.buffer,
            );
            const firstPixel = pixels[0];
            return pixels.some((pixel) => pixel !== firstPixel);
        });
    }
}
