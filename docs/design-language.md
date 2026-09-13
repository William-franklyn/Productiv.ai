# Design language

iRABU shares a brand with two sibling products — **getirabu.com** (the
enterprise platform) and **irabu.ai** (the permission-aware chat app). This
app's UI was rebuilt to match them rather than to invent a third look. If you
are changing anything visual, the short version is:

> Warm paper canvas, white cards, hairline borders, brand orange used
> sparingly, one radius scale, one type scale, dense 14px type.

All tokens live in [`src/app/globals.css`](../src/app/globals.css).

## The three rules

Break these and the UI drifts back to looking like a generic consumer app.

**1. Accent is for state and primary action only — never decorative fill.**
No accent-filled avatars, no gradient pills, no coloured glows, and
specifically **not hover**. The budget is: selection, focus ring, and the one
primary button per view. Hover uses `--surface-sunken`.

**2. Borders do the work, not shadows.** Hairline `--border` separators define
structure. Shadows belong only to true overlays (menus, modals) and stay
neutral and tight — never coloured, never a halo. Cards get a border, not a
shadow.

**3. One radius scale, one type scale.** Enumerated below. Reaching for an
arbitrary `rounded-2xl` or `text-4xl` is what makes a UI read as unfinished.

## The accent, and why it is three tokens

The brand orange is vivid enough to fail AA as *text* but fine as a *fill*.
Both siblings split it three ways rather than ship the failure, so this app
does too:

| Token | Use | Never |
|---|---|---|
| `--accent` | text, links, icons, badge text | as a button fill |
| `--accent-solid` | filled buttons and controls | as body text |
| `--accent-solid-fg` | the label *on* an `--accent-solid` fill | — |

**A `background: var(--accent-solid)` always pairs with
`color: var(--accent-solid-fg)` — never white.** Measured: ink on the fill is
4.94:1; white is ~3.5:1 and fails. The one exception is an icon-only control,
where a non-text glyph only needs 3:1.

Semantic fills follow the same contract: `--danger` pairs with `--danger-fg`,
because the correct label *inverts between themes* (white is 6.71:1 on the
light theme's dark red but 2.62:1 on the dark theme's lighter salmon).

## Scales

**Radius** — pick one of four. `--radius-sm` 4px (chips, badges) ·
`--radius` 6px (buttons, inputs, nav rows) · `--radius-md` 8px (cards,
panels) · `--radius-lg` 12px (modals).

`--radius-full` is reserved for avatars, status dots, and the chat composer
and its send button. That last one is a documented exception: a pill composer
is the load-bearing shape of every modern assistant UI, and squaring it off
makes chat read as a form. Do not extend it to buttons, chips, or nav.

**Type** — `--text-2xs` 11px (uppercase labels) · `--text-xs` 12px
(metadata) · `--text-sm` 13px (**default UI text**) · `--text-base` 14px
(body) · `--text-md` 16px (card titles, chat messages) · `--text-lg` 20px
(page titles) · `--text-xl` 26px (in-app hero).

`--text-2xl` 32px and `--text-display` 44px exist **only for the marketing
pages and the one hero stat tile**. Do not use them inside the product shell.

## Chat

Chat is the surface iRABU and irabu.ai most obviously share, so it follows
irabu.ai closely:

- **Composer** is a bordered pill on `--surface`. Its border quietly darkens
  on focus via the `.composer` class — no glow, no colour wash, no layout
  shift. A focus ring inside a rounded pill draws a square box in a round one,
  which is what makes typing look broken; `.composer textarea` suppresses it
  deliberately, and focus is still shown because `:focus-within` responds.
- **Send is a neutral ink disc** (`--ink-solid`), not an accent button. Keeping
  it neutral is what stops the composer competing with the view's actual
  primary action (rule 1).
- **Assistant turns are left-aligned, no bubble, no avatar,** at `--text-md`.
  The answer is the content, not a chat character speaking.
- **The user's own turn** gets a `--bubble` bubble, right-aligned.

## Shared primitives

Unlayered CSS classes in globals.css, so a nav row in the sidebar and a tab in
a sub-nav cannot drift apart: `.nav-row`, `.segmented` / `.segmented-item`,
`.eyebrow`, `.panel-label`, `.composer`.

**These are deliberately NOT inside `@layer components`.** Under Tailwind v4's
native cascade layers they get dropped entirely, which silently leaves nav as
unstyled inline text. Unlayered rules always apply.

## Theme

Light is the **unconditional default** — not the OS preference. Dark applies
only through an explicit stored choice (`localStorage["irabu-theme"]`, read by
the bootstrap script in `app/layout.tsx`). Reading the OS meant a system-dark
browser's first-ever visit rendered dark before anyone had chosen it.

Every colour token has a dark counterpart. The radius and type scales are
intentionally theme-independent and inherit.

## Charts

`ChartRenderer` owns a separate palette (`.viz-root`, `--series-1..8`). Those
hues are **colourblind-validated and are not retuned to the brand** — only the
surface/text/grid tokens follow the theme. If you change them, re-run the
palette validator; do not eyeball it.

## Before you commit a visual change

The source tree is currently free of bare Tailwind colour, radius, size and
shadow utilities. To keep it that way:

```bash
# should return nothing but comments
grep -rnE '(^|[" ])(text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)|rounded(-(2xl|xl|lg|md|sm))?|shadow(-(sm|md|lg))?)([" ]|$)' src/ --include="*.tsx"
grep -rn "text-white\|bg-white\|bg-black\|text-gray-\|bg-blue-" src/ --include="*.tsx"
```

And if you introduce a new colour pairing, **measure it** rather than
trusting it — that check is what caught all three contrast bugs in this
rebuild.
