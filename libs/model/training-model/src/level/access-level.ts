import { AbstractLevelBasic } from './abstract-level-basic';
import { Level } from './level';

/** Basic read-only access level data safe for all roles. Subset of {@link AccessLevel}. */
export class AccessLevelBasic extends AbstractLevelBasic {}

/**
 * Class representing level in a training of type Training
 */
export class AccessLevel extends Level {
    passkey!: string;
    cloudContent!: string;
    localContent!: string;
}
