# cyberrangecz-platform-e2e

Playwright e2e suite of the platform frontend. It drives the app at `https://localhost:4200`
against the backends named in `apps/cyberrangecz-platform/public/config.json`, in Chromium,
Firefox and WebKit. Specs assert state and components only. No origin of the deployed platform is
written into this directory; every origin and API root is read from that app config.

## What it covers

The suite runs as Playwright projects chained by dependencies. Project names are used with
`--project` (see Commands).

| Stage | Projects | Source | What it does |
|---|---|---|---|
| setup | `auth` | `src/setup/` | Signs every account in and saves its storage state. |
| setup | `shared` | `src/setup/` | Creates the shared training definition (from `src/resources/shared-training.yaml`), the sandbox definition, the pool and the instance. |
| pages | `chromium`, `firefox`, `webkit` | `src/pages/<area>/` | Every page of the app, grouped into the areas common, sandbox-definition, pool, training-definition, training-instance and user-and-group: inputs, validation, tables (sort, filter, paging), dialogs and role guards. |
| chain | `<browser>-chain` | `src/chain/` | One trainee per browser allocates a sandbox and plays the shared training to a finished run, the variant-answer level included. |
| pool-actions | `chromium-pool-actions` | `src/pool-actions/` | Chromium only. In a pool of its own, the sandbox organiser allocates, locks, unlocks and deletes sandboxes through each confirmation, then deletes the pool. |
| review | `<browser>-runs-ready`, `<browser>-review` | `src/review/` | `runs-ready` (`runs-ready.setup.ts`) waits until all three chains left a run. The review then has the organiser go through the three runs: results, runs, cheating detection, pool and sandbox pages, topology, console. It checks the exact score of every level, assessment included, worked out from the shared training and the training service's scoring rules. |
| destructive | `<browser>-destructive` | `src/destructive/` | Archives and deletes one run. Runs as the teardown of `runs-ready`, once every review has ended, whatever the review results. |
| logout | `<browser>-logout` | `src/logout/` | Each browser's trainee logs out, after that browser's pages and review have ended. |

`<browser>` is `chromium`, `firefox` or `webkit`. The wipe (`src/wipe/`) has a config of its own
and never runs as part of the suite.

## Prerequisites

- Node and npm as the frontend requires. `package.json` pins no Node version; it uses
  `@types/node` 24.
- Dependencies installed and the Playwright browsers installed (Chromium, Firefox, WebKit).
- The dev server running at `https://localhost:4200`, started separately. Neither the suite nor
  the wipe starts it. It uses a self-signed certificate, which the suite accepts.
- A wipe run before the first suite run (see Accounts).

## Commands

Run from the frontend root.

Wipe devel and prepare the accounts. Headed, a person signs in as an administrator in the window:

    npx nx run cyberrangecz-platform-e2e:wipe

Headless, signing in by itself as the administrator `user-30` (see the variables below):

    E2E_ADMIN_LOGIN=user-30 E2E_ADMIN_PASSWORD='<password>' npx nx run cyberrangecz-platform-e2e:wipe

Once `.state/credentials.json` holds that login's entry, the password variable is not needed:

    E2E_ADMIN_LOGIN=user-30 npx nx run cyberrangecz-platform-e2e:wipe

The whole suite:

    npx nx run cyberrangecz-platform-e2e:e2e

One project, or one spec, with the Playwright CLI and the suite's config. Projects a project
depends on run first, so `chromium` also runs `auth` and `shared`:

    npx playwright test -c apps/cyberrangecz-platform-e2e/playwright.config.ts --project=chromium
    npx playwright test -c apps/cyberrangecz-platform-e2e/playwright.config.ts --project=chromium src/pages/common/home.spec.ts

Project names: `auth`, `shared`, `chromium`, `firefox`, `webkit`, `chromium-pool-actions`, and
for each browser `<browser>-chain`, `<browser>-runs-ready`, `<browser>-review`,
`<browser>-destructive` and `<browser>-logout`.

The wipe deletes the training runs, sandboxes, training instances, training definitions, pools
and sandbox definitions on devel, and every deletable group except the kept ones
(`DEFAULT-GROUP`, `USER-AND-GROUP_ADMINISTRATOR`, `USER-AND-GROUP_USER`, `All Mighty Users`). It
then prepares the accounts and writes `.state/credentials.json`. Anything it could not remove is
listed as a leftover and fails its test.

## Environment variables

| Variable | Default | Effect |
|---|---|---|
| `E2E_APPLICATION_ORIGIN` | `https://localhost:4200` | The URL the app under test is served from. Read by the suite and the wipe. |
| `E2E_DEPLOYED_ORIGIN` | unset | The URL of the deployed frontend, on which the page specs whose file name matches `microservice.*spec.ts` run. Unset drops those specs together with the sign-in they need. |
| `E2E_ADMIN_LOGIN` | unset | Sign-in name of the administrator the wipe uses, such as `user-30`. Unset means a person signs in by hand in a headed browser, also under `CI`. An empty value counts as unset. |
| `E2E_ADMIN_PASSWORD` | unset | Password of that administrator. Meant for CI. Never printed or logged. An empty value counts as unset. |
| `E2E_SESSION_KEEP_ALIVE_MINUTES` | `4` | Minutes between two refreshes of every saved account's session during a run. Keep it below the realm's SSO Session Idle. |
| `CI` | unset | Any non-empty value makes the suite config refuse `test.only`, and makes the wipe fail at once when `E2E_ADMIN_LOGIN` is set but no password is found. |

Wipe sign-in, by what is set:

- Login set and a password found: the browser runs headless and the wipe signs in itself. The
  password comes from `E2E_ADMIN_PASSWORD`, otherwise from the login's entry in
  `.state/credentials.json`.
- Login set, no password, `CI` unset: headed manual sign-in, as if the login were unset.
- Login set, no password, `CI` set: the wipe fails and the error names `E2E_ADMIN_PASSWORD`.
- Login unset: headed manual sign-in.

The first headless run needs `E2E_ADMIN_PASSWORD`. The wipe then stores that login's seed password
in `.state/credentials.json`, so later local runs need only `E2E_ADMIN_LOGIN`. If the seed
users file has no entry for the login, the wipe reports a `seed account` leftover and the headless
sign-in fails.

## Accounts

Roles are defined in `src/support/accounts.ts`. Accounts are the seed users `user-1` to `user-13`
of the platform's seed users file; their sign-in names are those dashed names, numbered in the
order of `ACCOUNT_KEYS`.

| Account | Role |
|---|---|
| `user-1` | training designer |
| `user-2` | second training designer, in the group of `user-1` |
| `user-3` | training organiser, plus the sandbox organiser role |
| `user-4` | second training organiser, in the group of `user-3`; the training instance editor's organiser picker offers only users holding that role |
| `user-5` | sandbox designer |
| `user-6` | sandbox organiser |
| `user-7` | user-and-group administrator |
| `user-8`, `user-9`, `user-10` | the trainees of Chromium, Firefox and WebKit that the page specs use |
| `user-11`, `user-12`, `user-13` | the trainees of Chromium, Firefox and WebKit that play the chain and review specs |

`user-30` is the administrator the wipe signs in with. It is not a suite account and no spec uses
it.

The wipe removes each suite account from every kept group except `DEFAULT-GROUP`, then creates
one group `e2e-<account key>` for each non-trainee account, grants it the account's role set and
adds the account to it; the second training designer joins `e2e-trainingDesigner` and the second training organiser joins `e2e-trainingOrganizer` instead of getting a group. Trainees get no group of their own and keep the roles of `DEFAULT-GROUP`.
The account key is the name in `src/support/accounts.ts`, such as `trainingDesigner`.

The wipe also reads the seed users from the user-and-group service and writes the passwords of the
thirteen suite accounts, `user-1` to `user-13` in that order, and of `E2E_ADMIN_LOGIN` when set after
them, to `.state/credentials.json`, a flat map from sign-in name to password. The `auth` project
signs each account in with it. It also signs `user-7` in on the deployed origin, when `E2E_DEPLOYED_ORIGIN` is set.

## Local state

`.state/` in the suite directory holds what the stages hand to each other. It is local only: it is
excluded from git, and its files are never printed or committed. Files and folders the code
writes are mode 600 and folders mode 700.

| Path | Written by | Holds |
|---|---|---|
| `credentials.json` | the wipe | Passwords of the suite accounts and of the wipe administrator. |
| `storage/<origin>-<account key>.json` | `auth` | Browser storage state of one account at the application origin or the deployed origin, including its tokens. |
| `shared.json` | `shared` | The shared fixture: the entities the later projects use. |
| `chain-<browser>.json` | `<browser>-chain` | The record of that browser's chain, read by its review and teardown. |
| `attempts/<project>-<spec file>.json` | specs that create removable entities | The pools each attempt of that spec file created and the attempt number, read by the reset before a retry. |

## Token refresh

The identity provider's realm gives access tokens a short lifespan. When an account's saved tokens
are about to expire, the suite exchanges the saved refresh token for new ones, gives the browser
context the new set and saves it back to the account's storage state file, so every worker starts
from the newest tokens. API clients and browser contexts of one account in one worker share one
refresh. Nothing needs to be done by hand.

The suite does not need the `offline_access` scope. Its refresh tokens belong to each account's
sign-in session, which ends when it idles past the realm's SSO Session Idle, reaches SSO Session
Max, or is logged out. Two mechanisms keep the run going:

- While the run lasts, the global setup refreshes every saved account every
  `E2E_SESSION_KEEP_ALIVE_MINUTES`, so no session idles out.
- When the identity provider refuses a refresh token with `invalid_grant`, the worker takes a newer
  refresh token another worker saved, or signs the account in again in a browser of its own with
  the password from `credentials.json` and saves the new storage state over the old one.

Neither mechanism signs an account in again on its own: the keep-alive skips an ended session, and
the logout spec reads its account's refresh token without the renewal, so a session it ended stays
ended.

## Retries and infrastructure outages

The config retries a failed test twice.

- Infrastructure outage: after a failed test, a fixture of the shared `test` probes the identity
  provider's OIDC discovery URL and the three API roots from the app config. While any of them
  fails to answer (no connection, a timeout or a 5xx), it waits with exponentially growing pauses,
  5 seconds up to 5 minutes, for 30 minutes in total, then lets the retry start. A failure with
  the infrastructure answering fails as it would without the wait. Playwright cannot lengthen the
  retry count per test, so each wait uses up one retry; a test hit by outages more often than the
  retries allow stays failed. The wait is noted as an `infrastructure outage` annotation.
- Retry reset: a spec that creates removable entities records them through the `attemptLedger`
  fixture. Before a retried test, the fixture removes what earlier attempts of that spec file
  recorded, so the retry starts clean; removal is safe to repeat. Today the pool actions spec
  records its pool, and the chain removes its allocation only when it failed, otherwise a retry
  reuses it. The destructive spec creates nothing removable and runs without retries.

## Output

Results go under `dist/.playwright/apps/cyberrangecz-platform-e2e/`:

- `report/`: the HTML report;
- `slideshow/index.html`: the whole run as one segmented video, each test's three browsers
  playing side by side. `slideshow/manifest.json` lists the same `segments` for agents, plus
  `visualChecks`: for each canvas view (chart, topology, visualisation), the video, the second it
  is held still from, and what it should show. Specs never assert canvas content; an agent
  reviews the videos against that list. The folder is rebuilt on every run;
- `test-output/`: raw clips, screenshots and traces. Every test records video and a final
  screenshot; traces are kept for failures;
- `wipe/`: the wipe's own report and test output.

## Platform requirements

- The Keycloak client `CRCZP-Client` must list `https://localhost:4200` and
  `https://localhost:4200/login` as redirect URIs, or sign-in against a local dev server fails.
- Token lifespan needs no setting; see Token refresh.

## GitHub Actions

Store the administrator password as a repository secret and map it to `E2E_ADMIN_PASSWORD`; set
`E2E_ADMIN_LOGIN` beside it. GitHub Actions sets `CI`, so a missing password fails the wipe at
once instead of waiting for a person.

    env:
      E2E_ADMIN_LOGIN: user-30
      E2E_ADMIN_PASSWORD: ${{ secrets.E2E_ADMIN_PASSWORD }}

To run against a deployed frontend instead of a dev server, also set `E2E_APPLICATION_ORIGIN` to
its URL, for example `E2E_APPLICATION_ORIGIN=<origin>`. The microservice specs need
`E2E_DEPLOYED_ORIGIN=<origin>`.

## Known limitations

- The microservice specs run on the deployed origin, because the backends refuse the localhost
  origin (CORS). They run only when `E2E_DEPLOYED_ORIGIN` is set.

