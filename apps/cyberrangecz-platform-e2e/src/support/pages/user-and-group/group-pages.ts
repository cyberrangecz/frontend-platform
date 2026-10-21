import { expect, type Locator, type Page } from '@playwright/test';
import {
    bulkDeleteControl,
    control,
    expansionPanel,
    expansionPanelHeader,
    fieldErrors,
    fieldInput,
    pickerDay,
    pickerNextMonth,
    SentinelTable,
    tableFilterInput,
    openDateTimePicker,
    waitForPageReady,
} from '../../ui';
import { memberDisplayName } from './group-data';

/** The group overview at `/group`. */
export class GroupOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(): Promise<void> {
        await this.page.goto('/group', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get createButton(): Locator {
        return control(this.page, 'Create');
    }

    /** The bulk delete control, labelled with the selection size once rows are selected. */
    get deleteButton(): Locator {
        return bulkDeleteControl(this.page);
    }

    get filterInput(): Locator {
        return tableFilterInput(this.page);
    }

    /** Narrows the list to the groups whose name contains the text and waits for the reload. */
    async filterBy(text: string): Promise<void> {
        await this.filterInput.fill(text);
        await this.table.waitUntilLoaded();
    }

    rowOf(groupName: string): Locator {
        return this.table.rowByText(groupName);
    }

    nameLinkOf(groupName: string): Locator {
        return this.rowOf(groupName).getByRole('link', { name: groupName });
    }

    /** The inline delete action of a row. */
    deleteActionOf(groupName: string): Locator {
        return this.table.rowAction(this.rowOf(groupName), 'delete');
    }

    /** The inline edit action of a row. */
    editActionOf(groupName: string): Locator {
        return this.table.rowAction(this.rowOf(groupName), 'create');
    }
}

/** The group detail at `/group/:groupId`. */
export class GroupDetailPage {
    readonly membersTable: SentinelTable;
    readonly rolesTable: SentinelTable;

    constructor(readonly page: Page) {
        this.membersTable = SentinelTable.in(page, { column: 'Login' });
        this.rolesTable = SentinelTable.in(page, { column: 'Role Type' });
    }

    async open(groupId: number): Promise<void> {
        await this.page.goto(`/group/${groupId}`, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.membersTable.waitUntilLoaded();
        await this.rolesTable.waitUntilLoaded();
    }

    /** The summary card with name, description, expiration and counts. */
    get summaryCard(): Locator {
        return this.page.locator('mat-card').first();
    }

    get membersFilter(): Locator {
        return this.page.getByRole('textbox', { name: 'Filter by name' });
    }

    get rolesFilter(): Locator {
        return this.page.getByRole('textbox', { name: 'Filter by role type' });
    }
}

/** A search field of a group edit panel that offers choices, which are chosen and then confirmed with Add. */
class ResourceAssignment {
    constructor(
        protected readonly page: Page,
        readonly root: Locator,
    ) {}

    get table(): SentinelTable {
        return SentinelTable.in(this.root);
    }

    get addButton(): Locator {
        return control(this.root, 'Add');
    }

    /** The bulk delete control, labelled with the selection size once rows are selected. */
    get deleteButton(): Locator {
        return bulkDeleteControl(this.root);
    }

    get filterInput(): Locator {
        return this.root.getByRole('textbox', { name: /^Filter by/ });
    }

    /**
     * Types into a search field and ticks the first suggestion that matches, then closes the suggestion list.
     * The suggestion receives the click as an event, because the pointer cannot reach a suggestion panel that
     * opens beyond the viewport of a long page.
     */
    protected async choose(searchField: Locator, search: string, option: string | RegExp): Promise<void> {
        await searchField.fill(search);
        await this.page.getByRole('option', { name: option }).first().dispatchEvent('click');
        await this.page.keyboard.press('Escape');
    }

    /** Clicks Add and waits until the reloaded assigned table is idle. */
    async addChosen(): Promise<void> {
        await this.addButton.click();
        await this.table.waitUntilLoaded();
    }

    /** Selects the assigned row whose text matches. */
    async selectAssigned(text: string): Promise<void> {
        await this.table.rowCheckbox(this.table.rowByText(text)).check();
    }
}

/** The members panel of the group edit page. */
export class MemberAssignment extends ResourceAssignment {
    constructor(page: Page) {
        super(page, page.locator('crczp-group-user-assign'));
    }

    get userSearch(): Locator {
        return this.root.getByRole('combobox', { name: 'Search users by name' });
    }

    get groupSearch(): Locator {
        return this.root.getByRole('combobox', { name: 'Search groups by name' });
    }

    /** Searches a seed user by display name and chooses the suggestion carrying that name. */
    async chooseUser(subject: string): Promise<void> {
        const displayName = memberDisplayName(subject);
        await this.choose(this.userSearch, displayName, displayName);
    }

    /** Searches groups by name and chooses the suggestion whose text matches. */
    async chooseGroupToImport(search: string, option: string | RegExp = search): Promise<void> {
        await this.choose(this.groupSearch, search, option);
    }
}

/** The roles panel of the group edit page. */
export class RoleAssignment extends ResourceAssignment {
    constructor(page: Page) {
        super(page, page.locator('crczp-group-role-assign'));
    }

    get roleSearch(): Locator {
        return this.root.getByRole('combobox', { name: 'Search roles by name' });
    }

    async chooseRole(roleType: string): Promise<void> {
        await this.choose(this.roleSearch, roleType, roleType);
    }
}

/** The group form page at `/group/create` and `/group/:groupId/edit`. */
export class GroupEditPage {
    readonly members: MemberAssignment;
    readonly roles: RoleAssignment;

    constructor(readonly page: Page) {
        this.members = new MemberAssignment(page);
        this.roles = new RoleAssignment(page);
    }

    async openCreate(): Promise<void> {
        await this.page.goto('/group/create', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await expect(this.nameInput).toBeVisible();
    }

    /** Reaches the create form as a user does, through the Create control of the overview. */
    async openCreateFromOverview(): Promise<void> {
        const overview = new GroupOverviewPage(this.page);
        await overview.open();
        await overview.createButton.click();
        await waitForPageReady(this.page);
        await expect(this.nameInput).toBeVisible();
    }

    /** Reaches the edit form of a group as a user does, through the edit action of its overview row. */
    async openEditFromOverview(groupName: string): Promise<void> {
        const overview = new GroupOverviewPage(this.page);
        await overview.open();
        await overview.filterBy(groupName);
        await overview.editActionOf(groupName).click();
        await waitForPageReady(this.page);
        await this.expandInfoPanel();
        await expect(this.nameInput).toBeVisible();
    }

    async openEdit(groupId: number): Promise<void> {
        await this.page.goto(`/group/${groupId}/edit`, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.expandInfoPanel();
        await expect(this.nameInput).toBeVisible();
    }

    get form(): Locator {
        return this.page.locator('crczp-group-edit');
    }

    get infoPanelHeader(): Locator {
        return expansionPanelHeader(this.page, /^\s*(Create|Edit) Group/);
    }

    get infoPanel(): Locator {
        return expansionPanel(this.page, /^\s*(Create|Edit) Group/);
    }

    get membersPanelHeader(): Locator {
        return expansionPanelHeader(this.page, 'Edit Members');
    }

    get rolesPanelHeader(): Locator {
        return expansionPanelHeader(this.page, 'Edit Roles');
    }

    /** Opens the basic info panel when it is closed. */
    async expandInfoPanel(): Promise<void> {
        if ((await this.infoPanelHeader.getAttribute('aria-expanded')) !== 'true') {
            await this.infoPanelHeader.click();
        }
    }

    get nameInput(): Locator {
        return fieldInput(this.form, 'Name');
    }

    get descriptionInput(): Locator {
        return fieldInput(this.form, 'Description');
    }

    get expirationInput(): Locator {
        return fieldInput(this.form, 'Expiration Date');
    }

    nameErrors(): Locator {
        return fieldErrors(this.form, 'Name');
    }

    descriptionErrors(): Locator {
        return fieldErrors(this.form, 'Description');
    }

    expirationErrors(): Locator {
        return fieldErrors(this.form, 'Expiration Date');
    }

    /** Clear buttons of the form, in field order: name, description. */
    get clearButtons(): Locator {
        return this.form.getByRole('button', { name: 'Clear' });
    }

    /** The primary save control: Create on the creation page, Save on the edit page. */
    saveButton(mode: 'create' | 'edit'): Locator {
        return control(this.infoPanel, mode === 'create' ? 'Create' : 'Save');
    }

    get createAndContinueButton(): Locator {
        return control(this.infoPanel, 'Create and continue editing');
    }

    async fillBasicInfo(name: string, description: string): Promise<void> {
        await this.nameInput.fill(name);
        await this.descriptionInput.fill(description);
    }

    /** Picks the 15th day of next month in the expiration date picker. */
    async pickExpirationNextMonth(): Promise<void> {
        await openDateTimePicker(this.form, 'Expiration Date');
        await pickerNextMonth(this.page).click();
        await pickerDay(this.page, 15).click();
    }

    get unsavedMembersWarning(): Locator {
        return this.page.getByText('Changes in group members are not saved');
    }

    get unsavedRolesWarning(): Locator {
        return this.page.getByText('Changes in group roles are not saved');
    }
}
