---
name: "Halo Forge"
description: "A black and white research register for cryptography evidence."
colors:
  primary: "#f5f3ed"
  primary-foreground: "#12100a"
  gold: "#c2a66b"
  background: "#090909"
  foreground: "#f5f3eb"
  card: "#111111"
  panel: "#101010"
  popover: "#181818"
  secondary: "#242321"
  secondary-foreground: "#eee9dd"
  muted: "#1b1b19"
  muted-foreground: "#a9a69e"
  accent: "#302715"
  accent-foreground: "#ffd775"
  destructive: "#ff9a90"
  border: "#33312b"
  input: "#514b3e"
  ring: "#c2a66b"
  primary-hover: "#dad8d1"
  row-hover: "#191918"
  status-text: "#c8b990"
  status-surface: "#1b1915"
  status-border: "#4e4738"
  text-link: "#d7c7a5"
  focus-ink: "#242421"
  focus-muted: "#625d52"
  focus-rule: "#c8c5bd"
  diagram-wire: "#454136"
  diagram-chip: "#1e1d19"
  diagram-chip-border: "#565147"
  diagram-flow: "#ece5d3"
  focus-agent: "#e6e3da"
  focus-hover: "#d9d5c9"
  panel-border: "#2c2b27"
  row-alternate: "#121211"
typography:
  display:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "clamp(48px, 5.1vw, 76px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "44px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.04em"
  section:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "36px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.04em"
  panel-title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "22px"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "14px"
    lineHeight: 1.6
  button:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 550
    lineHeight: "1.25rem"
  label:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 450
    lineHeight: 1.6
  metric:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "38px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "-0.04em"
  mono:
    fontFamily: "Geist Mono Variable, monospace"
  team-title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "19px"
    fontWeight: 550
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  focus-title:
    fontFamily: "Geist Variable, sans-serif"
    fontSize: "25px"
    fontWeight: 550
    lineHeight: 1.2
    letterSpacing: "-0.035em"
rounded:
  surface: "2px"
  control: "2px"
  mark: "0"
  mobile-nav: "7px"
  note: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  base: "16px"
  row: "20px"
  gutter: "24px"
  section: "32px"
  wide: "42px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 0.625rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-outline:
    backgroundColor: "color-mix(in oklab, #514b3e 30%, transparent)"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 0.625rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.button}"
    rounded: "{rounded.control}"
    height: "44px"
    padding: "0 0.625rem"
  input:
    backgroundColor: "color-mix(in oklab, #514b3e 30%, transparent)"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "2rem"
    padding: "0.25rem 0.625rem"
  navigation:
    textColor: "#b0aca4"
    rounded: "0"
    padding: "28px 10px"
  chip-outline:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: "1.25rem"
    padding: "0.125rem 0.5rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "21px"
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
  team-row:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "30px 18px"
  research-focus:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    padding: "23px 26px 0"
  forge-mark:
    textColor: "{colors.foreground}"
    width: "36px"
    height: "36px"
---

# Design System: Halo Forge

## Overview

**Creative North Star: "The Zcash Research Register"**

Black surfaces, warm white type and fine rules give Halo Forge the clarity of a cryptography research register. Larger Geist headings and a bordered conceptual research panel establish contrast. Geist Mono identifies code and detailed evidence counts; headline metrics use Geist. Gold remains a quiet navigation and state accent, while white carries primary actions.

The Hashsmashers reference informs the horizontal shell and ruled records. The user rejected pixel typography and broad gold treatment. The refined identity uses an original three-part geometric mark, method-specific line diagrams and shadcn/ui controls. Research schematics explain the work without presenting projected results as achieved progress.

**Key Characteristics:**
- Black and white first, with restrained gold accents.
- Three-part geometric mark and a dark conceptual research panel with animated connector flow.
- Larger Geist hierarchy, ruled agent records and method-specific SVG symbols.
- Explicit preview, setup and conditional reward states.

## Colors

The palette is predominantly black and warm white. Frontmatter records the active dark theme and recurring final selector overrides in globals.css and the later research-identity.css; the root layout selects this theme.

### Primary
- **Warm White** (primary): filled primary actions, selection and caret. **Dark Ink** (primary-foreground) supplies their contrast. Primary hover remains neutral.

### Secondary
- **Quiet Gold** (gold, ring): active masthead underline, small state accents and field focus. **Pale Gold Link** (text-link) provides restrained inline navigation.
- **Pending Sand** (status-text, status-surface, status-border): written waiting/setup states.
- **Soft Coral** (destructive): error and destructive feedback.

### Neutral
- **Near Black** (background): page foundation. **Record Black** (card) and **Panel Black** (panel): persistent content surfaces. The panel override is intentionally distinct from the card token.
- **Warm Paper** (foreground): reading text. **Muted Stone** (muted-foreground): descriptions and secondary details.
- **Raised Charcoal** (popover), **Secondary Charcoal** (secondary) and **Muted Charcoal** (muted): overlay and interaction surfaces, with corresponding foreground tokens.
- **Ruled Border** (border), **Panel Border** (panel-border) and **Field Border** (input): separators and form affordances.
- **Research Ink** (focus-ink), **Research Muted** (focus-muted) and **Research Rule** (focus-rule): retired tokens from the former light research panel; the panel now uses card, muted-foreground and border tokens like other surfaces.
- **Alternate Record** (row-alternate): the middle founding-agent row, providing restrained rhythm.

The inherited shadcn accent pair is a warm interaction token, not permission to spread gold over major surfaces. Semantic success badges still contain local desaturated green literals; they are not the brand palette and are not promoted to frontmatter primitives.

**The Quiet Gold Rule.** Use white for primary actions, the geometric mark and reading hierarchy. Keep gold to small navigation, focus and state accents.

**The Evidence Signal Rule.** Pair state color with written status; styling must not imply verified, funded or paid activity.

## Typography

**Display and Body Font:** Geist Variable, sans-serif fallback. **Identifier Font:** Geist Mono Variable, monospace fallback. Both are imported locally by the root layout.

Clean sans-serif headings establish a stronger hierarchy without pixel typography. The display role belongs to the overview mission: 54px below 1100px, 46px below 900px, then clamp(44px, 12.2vw, 64px) with 1.04 line-height below 600px. Both headline lines use the reading foreground. Standard page headings use headline and become 34px below 600px. Team section headings become 32px below 900px and use 1.06 line-height on phones. Panels use panel-title; directory agent names retain title while founding-agent rows use team-title.

Headline metrics use the sans-serif metric role, becoming 32px on phones. Detailed evidence nodes retain 20px mono counts. Mission supporting copy is 16px/1.75 with a 47ch measure, 14px on tablets and 15px/1.65 on phones. The research panel uses focus-title, becoming 24px on tablets and 28px on phones. Its explanatory text is 12px/1.65; final captions are 10px, with setup state 11px or 10px on phones. These caption sizes are local annotations, not a general reading scale.

Form labels retain label. Masthead navigation remains 12px (11px below 1100px). Research and method descriptions commonly use 13–14px, and inline text links now use 13px.

**The Identifier Rule.** Use Geist Mono for identifiers, code and detailed evidence counts. Use Geist for prose, headings, navigation and headline metrics.

## Layout

The desktop shell uses a full-width horizontal masthead with a 78px minimum height, a 47px utility bar and a preview strip. Main content remains centered at a 1344px maximum outer width with 42px 32px 30px padding. The masthead and utility bar align content using max(32px, calc((100vw - 1280px) / 2)). There is no desktop sidebar offset.

At 1100px the masthead tightens. At 900px the masthead hides and navigation moves into the existing 280px shadcn Sheet. A single 68px mobile bar combines the geometric identity, menu, search and wallet action. Breadcrumbs hide; the disabled-research/payout notice remains directly beneath the bar. Main padding is 28px 24px, becoming 28px 20px at 600px.

The overview lead uses minmax(0, 1.15fr)/minmax(0, 1fr) columns with a 60px gap, narrowing to 34px below 1100px and equal columns with a 28px gap below 900px. At 600px it stacks; the research panel follows the hero with a 30px top gap and remains fully visible. Actions fill the width. Metrics form four ruled columns, reducing to two below 900px.

Founding-agent records have five desktop columns: symbol, identity, method, status and arrow. Methods move to a second row below 900px and full-width below 600px. The middle record has a subtle alternate fill. Directory cards, launch and reading layouts retain their existing stack below 980px. Six evidence stages become two rows of three on narrow screens, without a connector across rows.

Every shadcn button now has a 44px minimum height. Hero actions remain at least 46px and become 48px on phones. Research tabs are 44px; their agent footer link is at least 56px. Inputs, navigation, select triggers, tabs and text links retain the 44px narrow-screen minimum below 760px. Semantic tables scroll within their containers.

## Elevation & Depth

Persistent panels, rows and cards are flat, separated by subtle surface changes and one-pixel rules. Hover changes fill or border without lifting surfaces; method symbols alone move up 3px inside their stable row. Buttons have no box shadow in the final cascade. Temporary shadcn sheets retain ambient elevation and their overlay treatment; inputs retain focus rings, and links use a visible white outline. This is not a blanket prohibition on functional shadows.

**The Ruled Surface Rule.** Separate persistent records with tonal contrast and fine borders. Reserve elevation for temporary overlays.

Page entrance animation is disabled in the final cascade. Navigation and cards retain 160ms color transitions; team rows and research-panel agent links use a 180ms ease-out background transition. Method symbols use a 220ms ease-out transform transition. Sheets use a 200ms ease-in-out transition and their overlay uses 150ms opacity. Reduced-motion preference disables animations, transitions and smooth scrolling.

## Shapes

Most visible controls, badges, panels and cards have nearly square 2px corners. Evidence nodes are square. The brand uses three filled geometric segments; method symbols are specific line drawings rather than boxed text marks. The light research panel and its tabs have square corners. Mobile-sheet navigation retains 7px corners and inline notes/network boxes retain 8px corners. These are observed exceptions, not a universal rounded-card language. Fine rectangular boundaries carry the register; tiny state dots remain circular.

## Components

### Buttons

White primary actions anchor the interface. Default-size controls use the frontmatter dimensions, with neutral primary hover. Outline controls use input-color fill at 30%, increasing to 50% on hover; ghost controls use transparent fill and muted color at 50% on hover. Disabled controls block pointer interaction and reduce opacity. Enabled actions without popup behavior move down 1px when pressed. The final no-shadow override suppresses the button ring shadow; a ring-colored focus border remains. Anchor actions also inherit the visible white focus outline. All shadcn buttons have at least 44px height; hero actions have 20px horizontal padding and 46px minimum height, increasing to 48px on phones. Ordinary link buttons use 16px horizontal padding.

### Chips

Outline badges are compact rectangles with a one-pixel rule. They label identifiers and illustrative content. Status badges pair a dot and written state, with subdued sand for setup/waiting. They are informational, not interactive. The preview renders the readable outline primitive rather than promoting the small inherited status text size.

### Cards / Containers

Panels use the panel fill and panel-border override, one-pixel rules and surface corners; heading padding is 21px 24px, reducing to 20px on narrow screens. Agent directory cards use card fill and 21px padding, then 17px below 1200px and 20px below 980px. Their hover fill and border brighten subtly. Research and team records use horizontal separators rather than independent floating tiles.

### Inputs / Fields

Dark inputs use translucent field fill and a one-pixel input border. Base height is 32px; search inputs use 40px and labeled fields 42px before responsive minimums. Text is 16px by default and 14px from 768px. Focus uses the gold ring-colored border and a 3px half-opacity ring; invalid fields use destructive border and ring. Disabled controls reduce opacity. Textareas retain their 105px minimum height. Labels, hints and live status messages remain associated with their controls.

### Navigation

Desktop navigation is a horizontal masthead: neutral labels, a thin gold underline for the current page and warm dark hover fill. Icons and count chips hide in this masthead but remain in the mobile sheet. The desktop mark is white with a lowercase wordmark. On mobile a single branded utility bar replaces the masthead, while the sheet preserves all destination labels and utility routes. Visible keyboard focus must remain distinct from selected-page styling.

### Brand and research panel

The original three-part geometric mark appears in desktop and mobile headers, the footer and the favicon. The desktop mark is 36px, tablet 29px, phone 27px and footer 23px. Use the supplied SVG paths; the previous Z coin emblem is no longer the site identity.

The research panel is a bordered card-surface block on the dark shell. Its three shadcn tabs—Scalars, Memory and Scheduling—use muted labels, a gold selected underline, a subtle hover fill and an inset visible focus outline. Each selected method pairs a concrete explanation with a conceptual SVG diagram, labeled stages and a link to its assigned agent. Diagram connectors carry a slowly traveling dash pulse to suggest work in motion; the Memory loop keeps the quiet gold accent. Keep “Pilot / awaiting setup” and “Schematic, not results” visible. The desktop title/description reserves space to steady the panel between tabs; those minimum heights relax on phones.

### Team register and evidence progression

Founding-agent records combine a method-specific SVG symbol, identity, method description, written setup state and arrow. The panel's agent footer link is a darker raised band that brightens on hover. The whole record is a link. Symbols represent scalar layers, storage rows and scheduling lanes; they are not font glyphs. Desktop symbols are 56px, tablet 48px and phone 42px. Hover lifts only the symbol. The evidence progression uses 50px square nodes with 20px mono counts and one-pixel connectors. The active stage retains quiet warm text and border emphasis. Preview counts are explicitly illustrative.

## Do's and Don'ts

### Do:
- **Do** retain the black and white research register, shadcn/ui components and self-hosted Geist pairing.
- **Do** keep gold restrained and primary actions white.
- **Do** pair states with written labels and keep the live-disabled preview notice visible on mobile.
- **Do** preserve visible keyboard focus, reduced motion and responsive record stacking.
- **Do** distinguish planned rewards and illustrative records from funded or verified activity.

- **Do** use the three-part mark and labeled conceptual diagrams to explain research without claiming measured results.

### Don't:
- **Don't** use pixel fonts, broad gold surfaces, gradients or generated artwork.
- **Don't** restore the superseded lime brand palette or fixed desktop sidebar.
- **Don't** add another component kit, stock template or decorative kicker above the mission heading.
- **Don't** turn inherited small-caption styles or residual semantic success colors into new brand defaults.
- **Don't** imply real discoveries or payouts with sample metrics or remove functional overlay and focus treatments.
