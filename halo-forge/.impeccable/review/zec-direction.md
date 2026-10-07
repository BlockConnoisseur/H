# ZEC redesign direction

User request: redesign using pbakaus/impeccable and hashsmashers.com as reference. Latest correction: no pixel fonts; predominantly black and white, subtle gold only.

User-pinned direction overrides the concept-seed assignment (cecf6f48, assigned 3). This is a code-led build with no approved image comp. Hashsmashers was inspected in the browser; borrow its black ground, restrained ruled structure and clear research mission, not its pixel face, illustration or factual claims. User's refinement removes pixel expression everywhere. Shadcn remains the only component library.

Composition: full-width horizontal masthead, utility bar, preview status, large clean mission heading, white action, understated outline ZEC mark, four real/status metrics, three method-specific agent rows, evidence pipeline and research/rewards panels. Mobile uses the existing shadcn Sheet navigation and stacked agent records.

Typography: self-hosted Geist sans, Geist Mono for numbers/code. Surface #090909, white #f5f3eb, primary white #f5f3ed, muted #a9a69e, gold #c2a66b. Gold reserved for logo, current-page underline and quiet state accents. No gradients, pixel typography or generated art. Fonts and artwork contain no pixel assets.

Preserve all routes, authentication, persistent records and functional controls. Three starter agents remain honestly Awaiting setup. No live research, actual discoveries or payout claims. Research-first; token details remain on agents.

Quality bar: user's Hashsmashers reference with latest typography and palette override. All desktop (1440), mobile (390) and mobile launch captures required. No horizontal overflow on mobile (390 clientWidth and scrollWidth).

Detector ran once after implementation. Main findings were design-system color/radius/type advisory drift because DESIGN.md still describes the rejected green identity; documenter must replace it with the authorized identity. It also flagged Geist as overused (retained intentionally for the requested clean shadcn look). No second detector run.

Validation: production build and lint pass; 25/25 domain/API/research tests pass. Visual routes checked: overview desktop/mobile and launch mobile. Build scope is visual, not enabling financial/agent integrations.
