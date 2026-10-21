export const BROWSER_KEYS = ['chromium', 'firefox', 'webkit'] as const;
export type BrowserKey = (typeof BROWSER_KEYS)[number];

export const ACCOUNT_KEYS = [
    'trainingDesigner',
    'secondTrainingDesigner',
    'trainingOrganizer',
    'secondTrainingOrganizer',
    'sandboxDesigner',
    'sandboxOrganizer',
    'userAdministrator',
    'traineeChromium',
    'traineeFirefox',
    'traineeWebkit',
    'chainTraineeChromium',
    'chainTraineeFirefox',
    'chainTraineeWebkit',
] as const;
export type AccountKey = (typeof ACCOUNT_KEYS)[number];

/**
 * An account role a spec asks for; `trainee` stands for the trainee of the running browser that
 * the page specs use, `chainTrainee` for the one that plays the shared training in that browser.
 */
export type AccountRole =
    | Exclude<AccountKey, `trainee${string}` | `chainTrainee${string}` | 'secondTrainingDesigner' | 'secondTrainingOrganizer'>
    | 'trainee'
    | 'chainTrainee';

export interface Account {
    /** Keycloak sign-in name. */
    login: string;
    /** Subject the user-and-group service knows the account by. */
    subject: string;
    /** Role types granted on top of DEFAULT-GROUP by the account's own group. */
    roleTypes: readonly string[];
    /** Account whose role group this account joins instead of getting a group of its own. */
    sharesGroupWith?: AccountKey;
}

const TRAINEE: Omit<Account, 'login' | 'subject'> = { roleTypes: [] };

const TRAINING_DESIGNER_ROLE_TYPES = [
    'ROLE_GUACAMOLE_ORGANISER',
    'ROLE_GUACAMOLE_TRAINEE',
    'ROLE_TRAINING_DESIGNER',
    'ROLE_TRAINING_TRAINEE',
    'ROLE_USER_AND_GROUP_POWER_USER',
] as const;

const TRAINING_ORGANIZER_ROLE_TYPES = [
    'ROLE_GUACAMOLE_ORGANISER',
    'ROLE_GUACAMOLE_TRAINEE',
    'ROLE_SANDBOX-SERVICE_ORGANIZER',
    'ROLE_TRAINING_ORGANIZER',
    'ROLE_TRAINING_TRAINEE',
    'ROLE_USER_AND_GROUP_POWER_USER',
] as const;

/**
 * The seed accounts the suite signs in as. Each non-trainee account receives its own group whose
 * role set is the one listed here, unless it names an account to share the group of.
 */
export const ACCOUNTS: Record<AccountKey, Account> = {
    trainingDesigner: {
        login: 'user-1',
        subject: 'user1@crczp',
        roleTypes: TRAINING_DESIGNER_ROLE_TYPES,
    },
    secondTrainingDesigner: {
        login: 'user-2',
        subject: 'user2@crczp',
        roleTypes: TRAINING_DESIGNER_ROLE_TYPES,
        sharesGroupWith: 'trainingDesigner',
    },
    trainingOrganizer: {
        login: 'user-3',
        subject: 'user3@crczp',
        roleTypes: TRAINING_ORGANIZER_ROLE_TYPES,
    },
    secondTrainingOrganizer: {
        login: 'user-4',
        subject: 'user4@crczp',
        roleTypes: TRAINING_ORGANIZER_ROLE_TYPES,
        sharesGroupWith: 'trainingOrganizer',
    },
    sandboxDesigner: {
        login: 'user-5',
        subject: 'user5@crczp',
        roleTypes: [
            'ROLE_SANDBOX-SERVICE_DESIGNER',
            'ROLE_SANDBOX-SERVICE_TRAINEE',
            'ROLE_TRAINING_TRAINEE',
            'ROLE_USER_AND_GROUP_POWER_USER',
            'ROLE_USER_AND_GROUP_TRAINEE',
        ],
    },
    sandboxOrganizer: {
        login: 'user-6',
        subject: 'user6@crczp',
        roleTypes: [
            'ROLE_GUACAMOLE_ORGANISER',
            'ROLE_GUACAMOLE_TRAINEE',
            'ROLE_SANDBOX-SERVICE_ORGANIZER',
            'ROLE_TRAINING_TRAINEE',
            'ROLE_USER_AND_GROUP_POWER_USER',
        ],
    },
    userAdministrator: {
        login: 'user-7',
        subject: 'user7@crczp',
        roleTypes: [
            'ROLE_GUACAMOLE_ORGANISER',
            'ROLE_GUACAMOLE_TRAINEE',
            'ROLE_TRAINING_TRAINEE',
            'ROLE_USER_AND_GROUP_ADMINISTRATOR',
            'ROLE_USER_AND_GROUP_POWER_USER',
            'ROLE_USER_AND_GROUP_TRAINEE',
        ],
    },
    traineeChromium: { login: 'user-8', subject: 'user8@crczp', ...TRAINEE },
    traineeFirefox: { login: 'user-9', subject: 'user9@crczp', ...TRAINEE },
    traineeWebkit: { login: 'user-10', subject: 'user10@crczp', ...TRAINEE },
    chainTraineeChromium: { login: 'user-11', subject: 'user11@crczp', ...TRAINEE },
    chainTraineeFirefox: { login: 'user-12', subject: 'user12@crczp', ...TRAINEE },
    chainTraineeWebkit: { login: 'user-13', subject: 'user13@crczp', ...TRAINEE },
};

const TRAINEE_OF_ROLE: Record<'trainee' | 'chainTrainee', Record<BrowserKey, AccountKey>> = {
    trainee: { chromium: 'traineeChromium', firefox: 'traineeFirefox', webkit: 'traineeWebkit' },
    chainTrainee: {
        chromium: 'chainTraineeChromium',
        firefox: 'chainTraineeFirefox',
        webkit: 'chainTraineeWebkit',
    },
};

/** Resolves a role a spec asks for to the account that plays it in the given browser. */
export function accountFor(role: AccountRole, browser: BrowserKey): AccountKey {
    return role === 'trainee' || role === 'chainTrainee' ? TRAINEE_OF_ROLE[role][browser] : role;
}
