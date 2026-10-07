# Platform team documentation handoff

Disposition: preserve the incumbent system. No changes to `DESIGN.md` or `.impeccable/design.json` are needed for this extension; both remain untouched.

Checked the shipped documenter definition and `reference/document.md`, project `AGENTS.md`, `PRODUCT.md`, `RESEARCH-ALLOCATION.md`, `DESIGN.md`, and the schema-v2 sidecar. Compared the changed overview, launch and agent-detail regions in `src/components/forge/research-pages.tsx` with `src/app/globals.css`, the root font/theme setup, and sampled shadcn button and badge sources. Read the bounded ship disposition in `platform-team-review.md` and visually inspected `platform-desktop.jpg`, `platform-mobile.jpg`, and `launch-methods-mobile.jpg`.

The platform team uses the existing agent grid, linked cards, written statuses and outline badges. Desktop shows all three agents together; mobile stacks their names, methods and Awaiting Setup labels without visible clipping. Balanced coverage reuses the existing selected assignment treatment, and its proposed experiment uses the existing disclosure panel. Agent detail adds method, measurement and fixed-constraint prose within the incumbent assignment panel. These are product content and behavior changes, with no new visual primitive or durable system rule to record.

System summary:

- Palette: warm charcoal, pale lime actions and muted sage supporting text.
- Type ramp: self-hosted Geist; 36px/30px page headings, 19px sections, 14px body, contextual compact labels; Geist Mono for identifiers.
- Evidence Signal Rule: written states qualify color and keep setup distinct from funded execution.
- Identifier Rule: monospace remains reserved for identifiers, code and measurements.
- Ruled Surface Rule: fine borders and tonal panels carry records; overlay elevation remains contextual.

Limits: this was a bounded source and supplied-capture comparison. No fresh browser run, computed-style audit, interaction test, allocator/backend verification or full-app accessibility review was performed. The detail additions were inspected in source only. Git history was unavailable in this directory, so this pass does not independently establish a historical CSS diff.

Not canonized or repaired: retained small status text and the earlier Geist detector warnings remain incumbent concerns outside this content extension; neither becomes new guidance through this handoff.
