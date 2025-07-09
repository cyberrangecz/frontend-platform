import {Level} from './level';

/**
 * Class representing level in a training of type Training
 */
export class AccessLevel extends Level {
    passkey!: string;
    cloudContent!: string;
    localContent!: string;
}
