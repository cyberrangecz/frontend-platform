/**
 * Class representing reference solution of training level
 */
export class ReferenceSolutionNode {
    state_name!: string;
    prereq_state: string[] = [];
    cmd_type!: string;
    cmd!: string;
    cmd_regex!: string;
    optional!: boolean;
}
