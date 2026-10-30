import { NotificationService } from '@crczp/utils';

/**
 * Reports the outcome of requesting the cleanup of several sandboxes of a pool, warning about the
 * sandboxes the sandbox service left alone because their allocation is queued or its first stage
 * is running.
 * @param notificationService service emitting the notification
 * @param title title of the notification
 * @param skippedUnitIds ids of the allocation units left alone
 */
export function emitPoolCleanupResult(
    notificationService: NotificationService,
    title: string,
    skippedUnitIds: number[],
): void {
    if (skippedUnitIds.length === 0) {
        notificationService.emit('success', title);
        return;
    }
    const sandboxes = `${skippedUnitIds.length === 1 ? 'Sandbox' : 'Sandboxes'} ${skippedUnitIds.join(', ')}`;
    notificationService.emit('warning', title, [
        `${sandboxes} could not be deleted yet: their allocation is queued or in its first stage. ` +
            'Cancel the allocation, or delete them once it has moved on.',
    ]);
}
