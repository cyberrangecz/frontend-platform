import { expect, type Locator, type Page, type Request } from '@playwright/test';
import { control, expansionPanel, expansionPanelHeader, waitForPageReady, waitWhileLoading } from '../../ui';

/** The detection methods of the create form, named as the form prints them. */
export type DetectionMethod =
    | 'Answer Similarity'
    | 'Location Similarity'
    | 'Time Proximity'
    | 'Minimal Solve Time'
    | 'No Commands'
    | 'Forbidden Commands';

export const DETECTION_METHODS: readonly DetectionMethod[] = [
    'Answer Similarity',
    'Location Similarity',
    'Time Proximity',
    'Minimal Solve Time',
    'No Commands',
    'Forbidden Commands',
];

/** The create form of a cheating detection at `/linear-instance/:id/cheating-detection/create`. */
export class CheatingDetectionCreatePage {
    constructor(readonly page: Page) {}

    async open(instanceId: number): Promise<void> {
        await this.page.goto(`/linear-instance/${instanceId}/cheating-detection/create`);
        await waitForPageReady(this.page);
        await waitWhileLoading(this.createControl);
    }

    get createControl(): Locator {
        return control(this.page, 'Create');
    }

    /** The switch of a detection method. */
    methodSwitch(method: DetectionMethod): Locator {
        return this.page
            .locator('.slide-toggle-container')
            .filter({ hasText: method })
            .getByRole('switch');
    }

    get methodsPanel(): Locator {
        return expansionPanel(this.page, 'Cheating Detection Methods');
    }

    get timeProximityPanelHeader(): Locator {
        return expansionPanelHeader(this.page, 'Time Proximity Configuration');
    }

    get forbiddenCommandsPanelHeader(): Locator {
        return expansionPanelHeader(this.page, 'Forbidden Commands Configuration');
    }

    get timeThresholdInput(): Locator {
        return this.page.getByRole('spinbutton', { name: 'Time Threshold' });
    }

    get addForbiddenCommandButton(): Locator {
        return this.page.getByRole('button', { name: 'Add Forbidden Command' });
    }

    get deleteCommandButtons(): Locator {
        return this.page.getByRole('button', { name: 'Delete command' });
    }

    /** The command text input of the numbered forbidden command, counted from 1. */
    commandInput(number: number): Locator {
        return this.page.getByRole('textbox', { name: `Command ${number}` });
    }

    /** The BASH radio button of the numbered forbidden command, counted from 1. */
    bashRadio(number: number): Locator {
        return this.page.getByRole('radio', { name: 'BASH' }).nth(number - 1);
    }

    /** The Metasploit radio button of the numbered forbidden command, counted from 1. */
    metasploitRadio(number: number): Locator {
        return this.page.getByRole('radio', { name: 'Metasploit' }).nth(number - 1);
    }

    /** Clicks an off switch and waits until it reports on. */
    async turnOn(method: DetectionMethod): Promise<void> {
        const methodSwitch = this.methodSwitch(method);
        await methodSwitch.click();
        await expect(methodSwitch).toBeChecked();
    }

    /** Clicks an on switch and waits until it reports off. */
    async turnOff(method: DetectionMethod): Promise<void> {
        const methodSwitch = this.methodSwitch(method);
        await methodSwitch.click();
        await expect(methodSwitch).not.toBeChecked();
    }

    /** Switches the Time Proximity method on and sets its threshold in seconds. */
    async enableTimeProximity(thresholdSeconds: number): Promise<void> {
        await this.turnOn('Time Proximity');
        await this.timeThresholdInput.fill(String(thresholdSeconds));
    }

    /** Adds a forbidden command row of the given type with the command text, after the rows already present. */
    async addForbiddenCommand(type: 'BASH' | 'Metasploit', command: string): Promise<void> {
        const number = (await this.deleteCommandButtons.count()) + 1;
        await this.addForbiddenCommandButton.click();
        await expect(this.deleteCommandButtons).toHaveCount(number);
        await (type === 'BASH' ? this.bashRadio(number) : this.metasploitRadio(number)).check();
        await this.commandInput(number).fill(command);
    }

    /** Presses Create and resolves with the request that starts the detection. */
    async createAndCaptureRequest(): Promise<Request> {
        const request = this.page.waitForRequest(
            (candidate) => candidate.method() === 'POST' && /\/detection$/.test(candidate.url()),
        );
        await this.createControl.click();
        return request;
    }
}
