/**
 * This class represents a forbidden command
 * used in a forbidden command detection event
 */

export class ForbiddenCommand {
    command!: string;
    type!: string;
    cheatingDetectionId!: number;
}
