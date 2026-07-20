# CyberRangeᶜᶻ Platform Theme

This project unifies theme, styles, fonts, icons, and other assets for CyberRangeᶜᶻ Platform.

## Util styles cheatsheet

### Color variables

| Variable name               | options                                                          | description                                    |
|-----------------------------|------------------------------------------------------------------|------------------------------------------------|
| `--primary-<shade>`         | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Primary color shades                           |
| `--secondary-<shade>`       | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Secondary color shades                         |
| `--tertiary-<shade>`        | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Tertiary color shades                          |
| `--neutral-<shade>`         | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Neutral color shades                           |
| `--neutral-variant-<shade>` | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Neutral variant color shades                   |
| `--error-<shade>`           | `0, 10, 20, 25, 30, 35, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100` | Error color shades                             |
| `--primary`                 |                                                                  | Primary color, equivalent to `--primary-40`    |
| `--background`              |                                                                  | Background color, equivalent to `--neutral-98` |

### Color classes

| Variable name           | options                                                  | description                                                                  |
|-------------------------|----------------------------------------------------------|------------------------------------------------------------------------------|
| `bg-<shade>`            | `any valid shade`                                        | Set background color to shade of primary                                     |
| `fg-<shade>`            | `any valid shade`                                        | Set foreground color to shade of primary                                     |
| `bg-<prefix>-<shade>`   | `any prefix (primary, secondary,..) and any valid shade` | Set background color to shade of prefix                                      |
| `fg-<prefix>-<shade>`   | `any prefix (primary, secondary,..) and any valid shade` | Set foreground color to shade of prefix                                      |
| `bg-<shade>-f`          | `any valid shade`                                        | Set background color to shade of primary with !important to override Angular |
| `fg-<shade>-f`          | `any valid shade`                                        | Set foreground color to shade of primary with !important to override Angular |
| `bg-<prefix>-<shade>-f` | `any prefix (primary, secondary,..) and any valid shade` | Set background color to shade of prefix with !important to override Angular  |
| `fg-<prefix>-<shade>-f` | `any prefix (primary, secondary,..) and any valid shade` | Set foreground color to shade of prefix with !important to override Angular  |
| `bg-primary`            |                                                          | Set background color to default primary shade, equivalent to `bg-primary-40` |
| `fg-primary-f`          |                                                          | Set foreground color to default primary shade, with !imporant attribute      |
| `bg-neutral`            |                                                          | Set background color to default neutral shade, equivalent to `bg-neutral-98` |
| `fg-neutral-f`          |                                                          | Set foreground color to default neutral shade, with !imporant attribute      |


### Flexbox

| Class name                | description                   |
|---------------------------|-------------------------------|
| `vertical-flex / vflex`   | Colunn flexbox                |
| `horizontal-flex / hflex` | Row flexbox                   |
| `jc-fs`                   | Justify content flex-start    |
| `jc-fe`                   | Justify content flex-end      |
| `jc-c`                    | Justify content center        |
| `jc-s`                    | Justify content stretch       |
| `jc-sb`                   | Justify content space-between |
| `jc-sa`                   | Justify content space-around  |
| `jc-se`                   | Justify content space-evenly  |
| `ai-fs`                   | Align items flex-start        |
| `ai-fe`                   | Align items flex-end          |
| `ai-c`                    | Align items center            |
| `ai-s`                    | Align items stretch           |
| `ai-b`                    | Align items baseline          |


### Size

| Class name    | options                         | description           |
|---------------|---------------------------------|-----------------------|
| `wh-100`      |                                 | Width and height 100% |
| `w-<percent>` | 10, 20, 25, 30,..., 90, 100     | Width percentage      |
| `h-<percent>` | 10, 20, 25, 30,..., 90, 100     | Height percentage     |
| `w-<size>rem` | 0.25, 0.5, 0.75, 1, .., 3.75, 4 | Width in rem          |
| `mv-1920`     |                                 | Maximum width 1920px  |
| `mv-1280`     |                                 | Maximum width 1280px  |


### Spacing

| Class name           | options                                   | description            |
|----------------------|-------------------------------------------|------------------------|
| `g-<size>rem`        | 0.25, 0.5, 0.75, 1, .., 3.75, 4           | Gap in rem             |
| `p-<size>rem`        | 0.25, 0.5, 0.75, 1, .., 3.75, 4           | Padding in rem         |
| `m-<size>rem`        | 0.25, 0.5, 0.75, 1, .., 3.75, 4           | Margin in rem          |
| `p-<size>rem-<side>` | 0.25, 0.5, 0.75, 1, .., 3.75, 4 ; t,l,r,b | Padding in rem at side |
| `m-<size>rem-<side>` | 0.25, 0.5, 0.75, 1, .., 3.75, 4 ; t,l,r,b | Margin in rem at side  |


### Design tokens

Global `:root` CSS custom properties for spacing, font-size, and font-weight, generated from the
SCSS maps in `theming/definitions/scales.scss` (mirroring how `--primary-<shade>` etc. are
generated from `theming/definitions/variables.scss`). Consume them directly as `var(--token)` —
no `@use`/import required, same as the color variables above. Being global rather than
`:host`-scoped, they also reach detached surfaces such as CDK overlays and runtime-rendered HTML
(e.g. ECharts tooltip strings).

| Variable name           | options                                                 | description                                             |
|-------------------------|----------------------------------------------------------|---------------------------------------------------------|
| `--space-<step>`        | `4xs, 3xs, 2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl` | Spacing scale, 0.125rem to 2rem, for padding/margin/gap  |
| `--font-size-<step>`    | `2xs, xs, sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, 6xl`      | Font-size scale, 0.625rem to 3.5rem                      |
| `--font-weight-<step>`  | `regular, medium, semibold, bold`                       | Font-weight scale, 400 to 700                            |

**`--space-*`** (rem): `4xs` 0.125 · `3xs` 0.25 · `2xs` 0.375 · `xs` 0.5 · `sm` 0.625 · `md` 0.75 ·
`lg` 0.875 · `xl` 1 · `2xl` 1.25 · `3xl` 1.5 · `4xl` 1.75 · `5xl` 2

**`--font-size-*`** (rem): `2xs` 0.625 · `xs` 0.6875 · `sm` 0.75 · `md` 0.8125 · `lg` 0.875 ·
`xl` 1 · `2xl` 1.125 · `3xl` 1.375 · `4xl` 1.5 · `5xl` 2 · `6xl` 3.5

**`--font-weight-*`**: `regular` 400 · `medium` 500 · `semibold` 600 · `bold` 700

> These token vocabularies (`--space-md`, `--font-size-lg`, …) are deliberately distinct from the
> rem-in-name utility classes below (`p-0.5rem`, `w-0.5rem`) — the tokens are cascading custom
> properties, the utilities are class selectors. Prefer the tokens for any fixed spacing/font-size/
> font-weight value in component SCSS; do not hardcode a literal where a token step matches.

### Scroll and drag

| Class name            | description                       |
|-----------------------|-----------------------------------|
| `round-scrollbar`     | Blue scrollbar with rounded edges |
| `highlighted-resizer` | Blue shaded radius resizer        |


### Animations


| Animation name |
|----------------|
| `fadeIn`       |
| `slideDown`    |
| `slideUp`      |
| `slideRight`   |
| `slideLeft`    |
| `grow`         |

## Usage

### Assets

Assets are available for import at `"@crczp/theme/assets`.

To use the assets in your app, include them in your build under desired output path:
```json
"options": {
    "assets": [
        {
            "glob": "**/*",
            "input": "node_modules/@crczp/theme/assets",
            "output": "assets/"
        }
    ]
}
```

Afterward assets can then be accessed like this:
```html
<img src="/assets/logo/logo.svg" alt="CyberRangeᶜᶻ Platform logo">
```

### Components

Components are available for import at `"@crczp/theme/components`. They are standalone and require the theme variables to be accessible.

### Styles and theme

Import `"@crczp/theme/theming/apply-all.scss"` in your global `styles.scss` or `"node_modules/@crczp/theme/theming/apply-all.scss"` in your `angular.json`, under the `styles` array.

- This will apply the theme and styles to your project automatically.

In case you want more fine-grained control over styles applied, you can use individual styles from `/theming/styles`.
