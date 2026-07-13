import { AbstractLevelBasic } from './abstract-level-basic';
import { Level } from './level';

/** Basic read-only info level data safe for all roles. Subset of {@link InfoLevel}. */
export class InfoLevelBasic extends AbstractLevelBasic {}

/**
 * Class representing single level in a training of type Info
 */
export class InfoLevel extends Level {
    content!: string;
}
