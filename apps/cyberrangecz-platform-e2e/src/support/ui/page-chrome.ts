import type { Locator, Page } from '@playwright/test';
import { clickUntilVisible } from './overlays';
import type { TextMatcher } from './scope';

/** The page title, the first level-one heading inside the Sentinel layout. */
export function pageTitle(page: Page): Locator {
    return page.locator('sentinel-layout1').getByRole('heading', { level: 1 }).first();
}

/** The breadcrumb trail of the toolbar. */
export function breadcrumbs(page: Page): Locator {
    return page.locator('sentinel-breadcrumbs');
}

/** The breadcrumb entries, in order, as the label links without their dividers; the last one is the current page. */
export function breadcrumbEntries(page: Page): Locator {
    return breadcrumbs(page).locator('[data-cy="sentinel-agenda-breadcrumb"] a.sentinel-breadcrumb-text[href]');
}

/** The link of a breadcrumb by its label. Entries folded into the overflow menu are not links until it is opened. */
export function breadcrumbLink(page: Page, label: TextMatcher): Locator {
    return breadcrumbs(page).getByRole('link', { name: label });
}

/** The side navigation, in its classic or modern variant, including the flyout menus of the compact variant. */
export function navigation(page: Page): Locator {
    return page.locator('sentinel-nav, sentinel-modern-nav, .sentinel-modern-nav-menu');
}

/** A navigation link by its label; `aria-current="page"` marks the current page in the modern variant. */
export function navigationLink(page: Page, label: TextMatcher): Locator {
    return navigation(page).getByRole('link', { name: label, exact: typeof label === 'string' });
}

/** A navigation container (group of agendas) by its label: a button in the compact modern variant. */
export function navigationContainer(page: Page, label: TextMatcher): Locator {
    return navigation(page).getByRole('button', { name: label, exact: typeof label === 'string' });
}

/** The top bar. */
export function topBar(page: Page): Locator {
    return page.locator('sentinel-toolbar');
}

/** The signed-in user's name as the top bar prints it. */
export function toolbarUserName(page: Page): Locator {
    return topBar(page).locator('span.username');
}

/** The button that opens the user menu. */
export function userMenuButton(page: Page): Locator {
    return page.locator('[data-cy="sentinel-user-menu"]');
}

/** The open user menu panel: user card, account and logout entries. */
export function userMenu(page: Page): Locator {
    return page.locator('[data-cy="sentinel-user-menu-detail"]');
}

/** Opens the user menu. */
export async function openUserMenu(page: Page): Promise<void> {
    await clickUntilVisible(userMenuButton(page), userMenu(page));
}

/** The logout entry of the open user menu. */
export function logoutMenuItem(page: Page): Locator {
    return userMenu(page)
        .getByRole('menuitem')
        .filter({ has: page.locator('mat-icon', { hasText: 'exit_to_app' }) });
}

/** The button that opens the notification history menu. */
export function notificationMenuButton(page: Page): Locator {
    return page.locator('[data-cy="sentinel-notification-menu"]');
}

/** The open notification history menu. */
export function notificationMenu(page: Page): Locator {
    return page.getByRole('menu').filter({ has: page.getByRole('heading', { name: 'Notifications' }) });
}

/** Opens the notification history menu. */
export async function openNotificationMenu(page: Page): Promise<void> {
    await clickUntilVisible(notificationMenuButton(page), notificationMenu(page));
}

/** The navigation link that points at an application path such as `/pool`. */
export function navigationEntryByPath(page: Page, path: string): Locator {
    return navigation(page).locator(`a[href="${path}"]`);
}
