import { PlatformEventType } from '@crczp/visualization-model';

/** Glyph, foreground, and badge-background colours for one event-marker type. */
export interface TimelineIcon {
    readonly glyph: string;
    readonly color: string;
    readonly bgColor: string;
}

/** One event marker placed on the events lane. */
export interface TimelineMarker {
    readonly type: PlatformEventType;
    /** Absolute millisecond timestamp of the event. */
    readonly timestamp: number;
    /** Milliseconds elapsed from the run start. */
    readonly offsetMs: number;
    /** Level order active when the event occurred, or null for run-lifecycle events. */
    readonly levelOrder: number | null;
    /** Submitted answer text (wrong/correct), or null. */
    readonly answerText: string | null;
    /** Number of times the wrong answer was submitted, or null. */
    readonly submissionCount: number | null;
    /** Hint title, or null. */
    readonly hintTitle: string | null;
    /** Penalty points (hint or solution), or null. */
    readonly penaltyPoints: number | null;
}

/** One console command placed on the commands swarm. */
export interface TimelineCommand {
    /** Base tool/executable name. */
    readonly tool: string;
    /** Raw argument string; empty when invoked without arguments. */
    readonly commandArguments: string;
    /** Absolute millisecond timestamp of the command. */
    readonly timestamp: number;
    /** Milliseconds elapsed from the run start. */
    readonly offsetMs: number;
    /** Level order active when the command was issued, or null when unattributable. */
    readonly levelOrder: number | null;
    readonly commandType: string;
    readonly hostname: string | null;
    readonly username: string | null;
    readonly workingDirectory: string | null;
    readonly ipAddress: string | null;
    /** Deterministic vertical jitter in [0, 1) keeping the circle stable across polls. */
    readonly jitter: number;
}

/** The selected run's timeline view model. */
export interface EventTimelineVm {
    /** Run start timestamp (the x = 0 anchor), or null when no run is started/selected. */
    readonly runStartTimestamp: number | null;
    /** Run end timestamp, or null while the run is still running. */
    readonly runEndTimestamp: number | null;
    /** Owning trainee's user id, resolved to a name only at CSV export time. */
    readonly userId: number | null;
    readonly markers: readonly TimelineMarker[];
    readonly commands: readonly TimelineCommand[];
    /** Earliest entry offset (ms from run start) per entered level order. */
    readonly startsByOrder: ReadonlyMap<number, number>;
}

/** Empty view model emitted before a run is started/selected. */
export const EMPTY_VM: EventTimelineVm = {
    runStartTimestamp: null,
    runEndTimestamp: null,
    userId: null,
    markers: [],
    commands: [],
    startsByOrder: new Map(),
};
