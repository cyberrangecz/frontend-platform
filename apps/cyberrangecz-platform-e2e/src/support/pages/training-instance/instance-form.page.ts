import type { Locator, Page } from '@playwright/test';
import {
    clickControl,
    control,
    expansionPanel,
    fieldErrors,
    fieldInput,
    fillDateTime,
    formField,
    slideToggle,
    waitForPageReady,
    waitWhileLoading,
} from '../../ui';
import { formatPickerDateTime } from './instance-data';

/** The create and edit page of a training instance, which share one form. */
export class InstanceFormPage {
    constructor(readonly page: Page) {}

    /** Opens the create page and waits for its form. */
    async openCreate(): Promise<void> {
        await this.page.goto('/linear-instance/create');
        await waitForPageReady(this.page);
        await waitWhileLoading(this.titleInput);
    }

    /** Opens the edit page of an instance and waits for its form. */
    async openEdit(instanceId: number): Promise<void> {
        await this.page.goto(`/linear-instance/${instanceId}/edit`);
        await waitForPageReady(this.page);
        await waitWhileLoading(this.titleInput);
    }

    get formPanel(): Locator {
        return expansionPanel(this.page, /(Create|Edit) Training Instance/);
    }

    get organizersPanel(): Locator {
        return expansionPanel(this.page, 'Organizers');
    }

    get saveControl(): Locator {
        return control(this.page, 'Save');
    }

    get titleInput(): Locator {
        return fieldInput(this.page, 'Title');
    }

    get startTimeInput(): Locator {
        return fieldInput(this.page, 'Start Time');
    }

    get endTimeInput(): Locator {
        return fieldInput(this.page, 'End Time');
    }

    get accessTokenPrefixInput(): Locator {
        return fieldInput(this.page, 'Access Token Prefix');
    }

    titleErrors(): Locator {
        return fieldErrors(this.page, 'Title');
    }

    startTimeErrors(): Locator {
        return fieldErrors(this.page, 'Start Time');
    }

    endTimeErrors(): Locator {
        return fieldErrors(this.page, 'End Time');
    }

    accessTokenErrors(): Locator {
        return fieldErrors(this.page, 'Access Token Prefix');
    }

    startTimeField(): Locator {
        return formField(this.page, 'Start Time');
    }

    endTimeField(): Locator {
        return formField(this.page, 'End Time');
    }

    get showStepperBarToggle(): Locator {
        return slideToggle(this.page, 'Show Stepper Bar');
    }

    get backwardModeToggle(): Locator {
        return slideToggle(this.page, 'Backward Mode');
    }

    get localEnvironmentToggle(): Locator {
        return slideToggle(this.page, 'Local Environment');
    }

    /** The warning the panel header shows while the form holds unsaved changes. */
    get unsavedWarning(): Locator {
        return this.page.getByText('Changes are not saved');
    }

    /** The resource selector with the given label. */
    resourceSelector(label: string): Locator {
        return this.page.locator('sentinel-resource-selector').filter({ hasText: label });
    }

    get trainingDefinitionSelector(): Locator {
        return this.resourceSelector('Training Definition');
    }

    get poolSelector(): Locator {
        return this.resourceSelector('Pool');
    }

    /** Opens a resource selector and picks the option whose text matches. */
    async chooseResource(selector: Locator, optionText: string | RegExp): Promise<void> {
        await selector.getByRole('combobox').click();
        await this.page.getByRole('option', { name: optionText }).first().click();
    }

    /** Fills the start and end time inputs with the given dates. */
    async fillTimes(start: Date | null, end: Date): Promise<void> {
        if (start !== null) {
            await fillDateTime(this.page, 'Start Time', formatPickerDateTime(start));
        }
        await fillDateTime(this.page, 'End Time', formatPickerDateTime(end));
    }

    /** Presses Save through the control bar. */
    async save(): Promise<void> {
        await clickControl(this.page, 'Save');
    }
}
