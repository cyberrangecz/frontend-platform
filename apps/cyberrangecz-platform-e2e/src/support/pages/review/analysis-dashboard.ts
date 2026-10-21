import type { Locator, Page } from '@playwright/test';
import { captureDownload, type CapturedDownload, parseCsvRecords, waitForPageReady, wholeText } from '../../ui';

/** The three views of the analysis dashboard, as the URL fragment names them. */
export type DashboardView = 'aggregated' | 'individual' | 'assessment';

const VIEW_LABELS: Record<DashboardView, string> = {
    aggregated: 'Aggregated',
    individual: 'Individual',
    assessment: 'Assessment',
};

/** The analysis dashboard of a training instance at `/linear-instance/:id/analysis`. */
export class AnalysisDashboard {
    constructor(
        readonly page: Page,
        readonly instanceId: number,
    ) {}

    /** Opens a view of the dashboard, optionally with a trainee run selected, and waits for the page. */
    async open(view: DashboardView = 'aggregated', runId?: number): Promise<void> {
        const fragment = runId === undefined ? view : `${view}/${runId}`;
        await this.page.goto(`/linear-instance/${this.instanceId}/analysis#${fragment}`);
        await this.title.waitFor();
        await waitForPageReady(this.page);
    }

    /** The dashboard's own heading, "Analysis of" followed by the instance title. */
    get title(): Locator {
        return this.page.locator('crczp-analysis-dashboard').getByRole('heading', { level: 1 });
    }

    /** The view switch of the dashboard header. */
    get viewToggle(): Locator {
        return this.page.locator('crczp-analysis-dashboard crczp-segmented-toggle').first();
    }

    /** The view switch option of a view. */
    viewOption(view: DashboardView): Locator {
        return this.viewToggle.locator('mat-button-toggle').filter({ hasText: VIEW_LABELS[view] });
    }

    /** Switches the dashboard to a view through the view switch. */
    async selectView(view: DashboardView): Promise<void> {
        await this.viewOption(view).locator('button').click();
    }

    /** The chart panel card whose heading matches exactly. */
    panel(heading: string): Locator {
        return this.page.locator('crczp-chart-panel-shell').filter({
            has: this.page.getByRole('heading', { level: 3, name: heading, exact: true }),
        });
    }

    /** The error placeholder a panel shows when its data could not load. */
    errorPlaceholder(panel: Locator): Locator {
        return panel.locator('crczp-panel-placeholder').filter({ hasText: "Couldn't load data" });
    }

    /** The placeholder a panel shows when it has no data. */
    emptyPlaceholder(panel: Locator): Locator {
        return panel.locator('crczp-panel-placeholder').filter({ hasText: 'No data to display' });
    }

    /** The CSV download button of a panel. */
    csvButton(panel: Locator): Locator {
        return panel.getByRole('button', { name: 'Download CSV' });
    }

    /** The info button of a panel. */
    infoButton(panel: Locator): Locator {
        return panel.getByRole('button', { name: 'About this panel' });
    }

    /** Downloads the CSV of a panel. */
    downloadCsv(panel: Locator): Promise<CapturedDownload> {
        return captureDownload(this.page, () => this.csvButton(panel).click());
    }

    /** Downloads the CSV of a panel and parses it into records keyed by column header. */
    async downloadCsvRecords(
        panel: Locator,
    ): Promise<{ download: CapturedDownload; records: Record<string, string>[] }> {
        const download = await this.downloadCsv(panel);
        return { download, records: parseCsvRecords(download.content) };
    }

    /** The label of a tile of the data overview card, with its value and caption. */
    overviewTile(label: string): Locator {
        return this.page.locator('.data-overview__tile').filter({
            has: this.page.locator('.data-overview__tile-label', { hasText: wholeText(label) }),
        });
    }

    /** The scoreboard row of a run. */
    scoreboardRow(runId: number): Locator {
        return this.panel('Scoreboard').locator(`tr[data-run-id="${runId}"]`);
    }

    /** The rows of the trainee table of the individual view. */
    get traineeTableRows(): Locator {
        return this.page.locator('crczp-trainee-table tbody tr');
    }

    /** The trainee table row whose text contains the name. */
    traineeTableRow(name: string): Locator {
        return this.traineeTableRows.filter({ hasText: name });
    }

    /** The card describing the selected trainee of the individual view. */
    get traineeCard(): Locator {
        return this.page.locator('crczp-trainee-card');
    }

    /** One summary stat of the trainee card by its label. */
    traineeCardStat(label: string): Locator {
        return this.traineeCard.locator('.trainee-card__stat').filter({
            has: this.page.locator('.trainee-card__stat-label', { hasText: wholeText(label) }),
        });
    }

    /** The per-level rows of the trainee card. */
    get traineeCardLevels(): Locator {
        return this.traineeCard.locator('.trainee-card__level');
    }

    /** The roster rows of the assessment view. */
    get rosterRows(): Locator {
        return this.page.locator('crczp-trainee-list tbody tr');
    }

    /** The roster row whose text contains the name. */
    rosterRow(name: string): Locator {
        return this.rosterRows.filter({ hasText: name });
    }

    /** The roster column header that sorts by the given short or full label. */
    rosterHeader(label: RegExp): Locator {
        return this.page.locator('crczp-trainee-list').getByRole('columnheader', { name: label });
    }

    /** The detail of the selected assessment: header, statistics and questions. */
    get assessmentDetail(): Locator {
        return this.page.locator('crczp-assessment-detail');
    }

    /** One statistic of the assessment detail by its label. */
    assessmentStat(label: string): Locator {
        return this.assessmentDetail.locator('.assessment-detail--stat').filter({
            has: this.page.locator('.assessment-detail--stat-label', { hasText: wholeText(label) }),
        });
    }

    /** The question frames of the assessment detail, in question order. */
    get questionFrames(): Locator {
        return this.assessmentDetail.locator('crczp-question-frame');
    }

    /** The answer entries of a question frame. */
    answerSurfaces(frame: Locator): Locator {
        return frame.locator('crczp-answer-surface');
    }

    /** The trainee faces shown on an answer entry, one button per trainee who chose it. */
    faces(surface: Locator): Locator {
        return surface.locator('crczp-avatar-stack button.stack-face:not(.stack-badge)');
    }
}
