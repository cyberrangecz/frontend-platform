import { parse } from 'yaml';

/**
 * Reads the seed users file of the identity provider, a YAML list of `{name, password}` entries,
 * into a map from sign-in name to password.
 */
export function parseSeedUsers(text: string): Map<string, string> {
    const entries = parse(text) as { name: string; password: string }[];
    return new Map(entries.map(({ name, password }) => [name, String(password)]));
}
