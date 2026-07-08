# Design notes — bridging to Cramer's Rule

*Status: both designs below have been BUILT as standalone slide-deck practice
files (see bottom of this doc for exact filenames and what changed in
`matrix-lab.js`). The rest of this file is kept as-is, as the original design
record — read it as "why it was designed this way," not "what to build."*

## Where this picks up

Module 5 currently ends its matrix-multiplication arc at Activity 9 (word
problems solved by dragging to a target, reading the answer off, then
seeing `M⁻¹` name what just happened). The open question was: does this
naturally extend to **Cramer's Rule**, and if so, what activity teaches it
without naming the method up front — letting students do something and
notice the structure in hindsight, the same way Activity 8/9 already work?

Two activity designs came out of that discussion, described below. Both are
worth building; suggested order is A before B (A reuses engine pieces we
already have, B needs one new engine feature).

## An idea that was proposed and rejected — worth remembering *why*

The first idea on the table was: let a student increase one vector's
multiplier until they "can't add any more," then switch to increasing the
other vector, and reflect on what that process was doing.

This doesn't actually reach the answer in general, and it's worth keeping
the counterexample on record so we don't reconsider it later without
re-deriving why. Using the matrix and target already used throughout this
module — `M = [[2,1],[1,1]]`, target `(8,5)`, known answer `(3,2)`:

- Increasing `x·col1 = x·(2,1)` alone (y=0) until adding more would
  overshoot the target in some coordinate: `2x ≤ 8 → x ≤ 4`; `x ≤ 5`. The
  binding constraint is `x = 4`, landing at `(8, 4)`.
- Switching to increase `y·col2 = y·(1,1)` from there: reaching `(8,5)`
  needs `8 + y = 8` (so `y = 0`) **and** `4 + y = 5` (so `y = 1`) at the same
  time — contradiction. A single forward-only pass cannot close the gap.

Making it work would require alternating forward/backward adjustments to
convergence — which is a real technique (coordinate-descent /
Gauss-Seidel-style iterative solving), but it isn't Cramer's Rule or
standard elimination, it doesn't correspond to anything already built in
this module, and it doesn't converge for every matrix (no diagonal-dominance
guarantee at this level), so it risks teaching something fragile. Decided
against building this one.

## Design A — "ratio of areas" (recommended to build first)

**What it reuses:** the vector-combination canvas from Activity 8/9
(`col1`, `col2`, `target` all visible as points/arrows) plus the
determinant-as-area engine already built for Activity 5. No new MatrixLab
feature needed — this is a recombination of two things that already exist.

**The activity:** alongside the existing drag-to-target interaction, show
three live parallelogram areas, color-matched to the existing red/purple
column convention:

- area(`col1`, `col2`) — the "reference" parallelogram (this is `det(M)`,
  already meaningful from Activity 5)
- area(`target`, `col2`)
- area(`col1`, `target`)

Don't name Cramer's Rule or give a formula. Instead, have the student try
several different matrices/targets (a "try another one" button, keeping
previous trials visible rather than clearing them — leave a trace, per our
usual design principle) and log, per trial: the three areas, and the
`(x, y)` they found by dragging to match the target. With a handful of
trials sitting side by side, the pattern to notice is:

```
x = area(target, col2) / area(col1, col2)
y = area(col1, target) / area(col1, col2)
```

That's Cramer's Rule, discovered as a ratio of areas rather than handed
over as a formula — and it's a direct generalization of "det = area
scaling," which is exactly the kind of "new knowledge extends old knowledge"
narrative this module has been building toward from the start.

**Reflection prompt (name it only now):** "Try writing the ratio you found
using the matrix entries `a, b, c, d` instead of areas — does it match
anything you already have a name for?"

## Design B — "combine the lines until one is flat" (build second — needs a new engine feature)

**What it reuses:** the two-lines-crossing canvas from Activity 8 Step 2/3
(`systemLines`).

**What's new and not yet in `matrix-lab.js`:** a "combined line" renderer —
given the two existing lines `a1x+b1y=c1` and `a2x+b2y=c2`, plus two
slider-controlled weights `k1, k2`, render the third line
`(k1·a1+k2·a2)x + (k1·b1+k2·b2)y = (k1·c1+k2·c2)`. This is a genuinely new
`MatrixLab` capability (today `systemLines` only takes fixed lines, not a
live weighted combination) — budget real engine time for this one, unlike
Design A.

**The activity:** give students the two sliders and one instruction, no
vocabulary: "can you make the third line perfectly flat (horizontal)?" Once
they find it, the combined line has no `x` term left — read `y` straight
off. A second challenge ("now make it perfectly vertical") eliminates `y`
instead and reads `x` off directly. This is elimination-of-variables made
into a physical, hands-on action — the student is doing exactly what
substitution/elimination does algebraically, but experiences it as "I made
a line flat," not as symbol manipulation.

**Reflection prompt:** "What did making the line flat actually do to the
variables in its equation?" — this is where "elimination" gets named, after
the fact.

## Why build both, and the closing connection

The `k1, k2` values that flatten the combined line in Design B are, not by
coincidence, the same determinant ratios discovered as areas in Design A.
If both are built, the strongest closing move for the pair is a reflection
question that asks students to notice that directly: "Design A found `(x,
y)` using areas; Design B found it by flattening a line — why do you think
they agree?" That question *is* the meta-goal for this whole module (new
knowledge as a generalization of what's already known) showing up one more
time, at the very top of the arc.

## Suggested build order

1. Design A first — no new engine work, reuses Activity 5's det/area
   rendering and Activity 8/9's vector-combination canvas directly.
2. Design B second — needs the new weighted-line-combination feature in
   `matrix-lab.js` before any HTML/activity work can start.

## Build log (both now done)

Built as two separate standalone slide decks, per the "keep them separate"
call:

- `practice-cramers-rule-areas.html` — Design A. Six slides (intro → an area
  you already know → two more areas → try it again with a logged trial table
  → reflection → wrap-up naming Cramer's Rule).
- `practice-cramers-rule-elimination.html` — Design B. Seven slides (intro →
  recall the two-lines-crossing task → make it vertical (find x) → make it
  flat (find y) → try another system with a logged trial table → reflection
  → wrap-up naming elimination).

Two corrections to this doc's original plan, found during implementation:

- **Design B needed no new "combined line" engine feature after all** — the
  existing `setSystemLines()` setter already accepts any `{a,b,c}`, so the
  weighted combination `k1·line1 + k2·line2` is computed in the activity's
  own JS on every slider `input` event and just passed straight in. The
  concern above (that this needed real engine work) turned out to be overly
  conservative.
- **Design A did need one small addition**: a generic filled-parallelogram
  renderer, since showing "area" as a real shape (not just a number) turned
  out to matter for the pedagogy. Added to `matrix-lab.js` as an opt-in
  `parallelograms` array (`_fillParallelogram`) plus a `vectorArrows` array
  (`_strokeRawVector`) for drawing an arbitrary vector — e.g. the target —
  as a labeled arrow without hijacking the existing basis-vector machinery
  (which always draws the *instance's own matrix columns*, not an arbitrary
  vector). Both are additive/opt-in and were regression-tested against all
  9 main-module panels plus the existing slide prototype with zero
  behavior change to anything that doesn't use them.

Both files independently reuse the `showLiveGrid: false` fix (see this
module's other prototype) on any canvas where a matrix is being used purely
as a computation rather than an actual shape transformation — applied here
proactively rather than left as a known issue.

Neither file has been linked into the main `index.html` course flow or
synced to the device yet unless a later note in this file says otherwise —
check with whoever's driving before assuming they're "in" the course.

**Update — collapsed "sample answer" added to both reflection slides.**
Both files' reflection slide (`practice-cramers-rule-elimination.html`
Slide 5, `practice-cramers-rule-areas.html` Slide 4) now have a
collapsed-by-default `hint-toggle`/`hint-body` block ("💡 See a sample
answer") below the reflection questions, same visual pattern as the
existing "Why does this work?" hints elsewhere in each deck. Intent:
let the learner form their own answer first, then reveal a model answer
to check against, rather than the reflection questions being open-ended
with no way to self-check. Both wired via the existing `bindHint()`
helper already used for every other hint toggle in each file
(`bindHint("s5hintBtn","s5hintBody")` in elimination,
`bindHint("s4hintBtn","s4hintBody")` in areas) — no new mechanism, pure
reuse of the established collapsed-hint pattern. Verified via `node
--check` on the extracted script block and a Playwright pass confirming
the hint starts collapsed and opens on click with zero console errors, in
both files.

## Pending enhancement — now BUILT (see "Done" note at the end of this section)

**Add a computed "ratio k1:k2" column to the trial-log table in
`practice-cramers-rule-elimination.html`, Slide 4 (`#s4table`).**

Why this came up: after reviewing a real screenshot of trial-log data from
this activity (7 logged rows), two rows had different absolute `(k1, k2)`
values but the same ratio (e.g. row 5 and row 7 both landed on ratio
`-0.5`, from different absolute pairs like `(k1=-1, k2=2)` and
`(k1=-2, k2=4)` — exact values from the reviewed screenshot, not
reconstructed here). The table currently shows raw `k1` and `k2` columns
(so a learner can see *which slider combination* produced a working line —
useful for redoing/comparing trials) plus a "value read off" column (the
x or y value read from the flattened line) and an "actual answer" column
(the true answer from `solveSystem`, shown so the learner can check their
read-off value against ground truth — this is *not* the same thing as the
ratio).

The insight the ratio-invariance pattern is meant to surface — that many
different absolute `(k1, k2)` pairs all work as long as their *ratio* is
right — is currently something the learner has to notice by mentally
dividing two numbers themselves. Adding a computed column removes that
manual-division step and puts the pattern directly in front of them.

**Planned implementation (when actually built):**
- Add one more `<th>`/`<td>` to `#s4table`, header something like
  "k1 : k2 ratio" or "k1/k2".
- Compute in the `logBtn` click handler (Slide 4 IIFE), alongside where
  `k1`/`k2`/value-read-off/actual-answer are already read: `k1/k2` (guard
  divide-by-zero — if `k2` is ~0, show something like "∞" or "k2≈0"
  rather than `Infinity`/`NaN`; likely reuse a small epsilon check similar
  to what already guards the "make it flat"/"make it vertical" win-state
  logic elsewhere in this file).
- Decide on display precision (probably 2 decimal places, consistent with
  how `k1`/`k2` sliders already display) and whether to normalize sign/order
  (e.g. always show the ratio in the same direction so two matching trials
  visually read identically, not as `-0.5` in one row and `0.5`/`2.0` in
  another due to k1/k2 being swapped).
- No engine change needed — this is activity-local JS + one table column,
  same pattern as the rest of Slide 4.

**Second, related pending item — add a "Combined line" column to the same
table, alongside (not instead of) "Made".**

Why this came up: the existing "Made" column only records a graphical
category — `"vertical (found x)"` or `"horizontal (found y)"` (see
`render()`, where `lastResult.made` is set). It never records the actual
combined-line equation the learner produced. The live `#s4compare` element
already displays this equation on screen during the trial (`Combined
line: {a}x + {b}y = {c}`, via `roundTo2dp`), but it's never captured into
the logged row, so once a learner moves on to the next trial, that
specific equation is gone — only the category label and the read-off
value persist.

The pedagogical gap: the module's reflection question for this activity
is "What did making the line flat actually do to the variables in its
equation?" — but a logged row showing only `"vertical (found x)"` makes
the learner reconstruct the connection to "a coefficient became ≈0" from
memory. A logged row showing the actual equation (e.g. `0.02x + 1.20y =
6.00`) makes the vanishing coefficient visible as standing evidence in the
table itself — the learner can look back across several trials and notice
directly "the x-coefficient is ≈0 in every row where I found x," which is
a stronger, more concrete version of the same insight the "Made" column
was already gesturing at.

Decision: keep **both** columns rather than replacing one with the other.
"Made" stays because it's fast to scan across many rows (spot which
system/trial found x vs. y at a glance); "Combined line" is added because
it's the symbolic evidence that directly backs the reflection question.

**Planned implementation (when actually built):**
- Add one more `<th>`/`<td>` to `#s4table`, header something like
  "Combined line".
- `render()` already computes `line = combinedLine(k1, k2, sys)` on every
  slider `input` event — just also stash `line.a`, `line.b`, `line.c` (or
  the fully formatted string, matching the exact `roundTo2dp` formatting
  already used for `#s4compare`) onto `lastResult` at the same point
  `lastResult.made` is set, so it's available unchanged at log time.
- Format identically to the existing live `#s4compare` text (`{a}x + {b}y
  = {c}`, `roundTo2dp`'d) for visual consistency between the live display
  and the logged row.
- No engine change needed — same activity-local JS pattern as the ratio
  column above; both pending items touch the same `logBtn` handler and
  `#s4table` markup, so worth implementing together in one pass rather
  than two separate edits to the same table.

**Done — both items above are now implemented in
`practice-cramers-rule-elimination.html`, Slide 4 `#s4table`.**

Final column order: `System | Made | k1, k2 | k1 : k2 ratio | Combined
line | Value read off | Actual answer`. Implementation notes, differing
slightly from the original plan above:

- `ratioStr` and `combinedLineStr` are computed once per `render()` call
  (right after `line = combinedLine(k1, k2, sys)`, before the
  vertical/horizontal branch) and stashed onto `lastResult` in both the
  vertical and horizontal winning branches, alongside the existing
  `made`/`value`/`actual` fields — so `logBtn`'s click handler just reads
  `lastResult.ratio` / `lastResult.combined` like everything else already
  there.
- Divide-by-zero guard: `Math.abs(k2) < 1e-6` shows `"∞"` (or `"0 : 0"` if
  `k1` is *also* ~0) instead of computing `k1/k2` directly, avoiding
  `Infinity`/`NaN` in the table.
- **The sign/order normalization question from the original plan turned
  out to be a non-issue**: `k1/k2` is already invariant to any common
  scaling of both values, *including a sign flip* — `(c·k1)/(c·k2) =
  k1/k2` for any nonzero `c`, positive or negative. So two trials like
  `(k1=1, k2=-2)` and `(k1=-0.5, k2=1)` both correctly show `-0.50` with
  no extra normalization logic needed; no code beyond the plain division
  was required.
- Verified via `node --check` on the extracted script and a Playwright
  run that logged two trials with different absolute `(k1, k2)` but the
  same ratio (`(1, -2)` and `(-0.5, 1)`, both on `SYS2`) — both rows
  correctly showed ratio `-0.50` and their own distinct `Combined line`
  text (`1x + 0y = 2` and `-0.5x + 0y = -1` respectively), with the
  eliminated variable's coefficient at `0` in both — zero console errors.
- No `matrix-lab.js` engine changes — confirmed activity-local, as
  planned.

Synced to the device alongside this note.

## Update — Slide 1 now has a "not a whole number" contrast example

Added a toggle button (`#s1toggleBtn`) to Slide 1 ("Two lines, one
crossing") of `practice-cramers-rule-elimination.html` that swaps in a
second system, `SYS1B` (`x − 3y = −1` and `x + y = 5`, crossing at
`(3.5, 1.5)`), alongside the original `SYS1` (crossing at the whole-number
point `(3, 2)`).

Why: `matrix-lab.js`'s free-point drag has a "magnet" (`round2()`) that
snaps to the nearest *whole number* whenever the drag is within 0.15
units of one — so with the original whole-number-only example, a
participant's imprecise drag gets silently corrected to the exact answer,
making the task feel easier than dragging-by-eye actually is. That
quietly undersells the point of Slides 2–3 (a method that finds the
answer exactly no matter what the numbers are). The new `(3.5, 1.5)`
example was chosen specifically because it's still easy to *see* on the
grid (it sits visibly halfway between grid lines) but gets no magnet
assist, so landing on it exactly by drag is noticeably harder — a felt
reason, right before Slides 2–3, for why the upcoming method matters.

Implementation: `usingTrickier` boolean in the Slide 1 IIFE; the toggle
button relabels itself ("Try one that's not a whole number →" / "← Back
to the first example"), swaps `systemLines` via the existing
`setSystemLines()` setter, and resets the free point to `(1, 4)` (chosen
to sit roughly equidistant from both candidate answers, so switching
examples doesn't start the learner suspiciously close to either one).
`renderS1()`'s win-tolerance check now reads whichever answer
(`ANSWER1`/`ANSWER1B`) matches the current toggle state.

One rendering snag found and fixed along the way: the first candidate
second-system (`x − y = 2`, slope 1) had its line label ("x − y = 2")
clipped off the canvas edge — `_strokeSystemLine()`'s label-nudge-in
logic (`t = 0.14` from one clipped endpoint) isn't enough headroom for a
line that exits the box near a corner. Rather than touch the shared
engine method (which every system-line label in every activity relies
on), swapped to a shallower line (`x − 3y = −1`, slope 1/3) that still
crosses at the same `(3.5, 1.5)` point but exits the box through a side
rather than near a corner, giving the label enough room. No
`matrix-lab.js` changes were needed or made.

Verified via `node --check` and Playwright: toggled the example back and
forth with zero console errors, confirmed both labels render fully
on-canvas, and clicked through all 7 slides end-to-end to confirm nothing
elsewhere in the file regressed.

## `practice-cramers-rule-areas.html` — two items recorded, both now resolved

Both raised in the same message; explicitly deferred — "บันทึกเก็บไว้ รอ
บอกให้ปรับ ค่อยแก้ไข" (record it, wait to be told to adjust, only then
fix it). Do not edit `practice-cramers-rule-areas.html` for either item
below until asked.

**1. "Sample answer" toggle on the reflection slide — already done,
no action needed.** Checked the current file: Slide 4 ("What did you
notice?") already has the collapsed-by-default `#s4hintBtn` /
`#s4hintBody` ("💡 See a sample answer") block, added earlier in this
same working session (see the "collapsed 'sample answer' added to both
reflection slides" update above) and already synced to the device. Worth
double-checking on the actual device copy if it doesn't appear there —
but nothing new to build here.

**2. Real bug — Slide 3's target point overflows the visible canvas
frame for two of the three presets.**

Slide 3 ("Try it again — and again") constructs its `MatrixLab` once
with a *fixed* `range: 6, center: { x: 4, y: 3 }` — this gives a visible
coordinate box of `x: [-2, 10], y: [-3, 9]`. `loadPreset(i)` (the "Try
another example" handler) swaps the matrix, target, and parallelograms
via setters, but never adjusts `range`/`center` — so all three presets
share that one fixed box, sized around `PRESETS[0]`.

Checking each preset's `target` against that fixed box:
- `PRESETS[0]` target `(8, 5)` — fits, with margin (2 units from the
  right edge, 4 units from the top edge).
- `PRESETS[1]` target `(8, 11)` — **overflows**: `y = 11` is 2 units past
  the top edge (`y1 = 9`). This target likely doesn't render inside the
  visible canvas at all.
- `PRESETS[2]` target `(10, 6)` — **right on the edge**: `x = 10` exactly
  equals the box's right boundary (`x1 = 10`), so it renders clipped or
  right at the edge rather than comfortably inside.

This matters beyond cosmetics: the core "drag to match" feedback in this
activity is *visual* (watch the dashed combined vector reach the orange
target dot) — when the target itself isn't visibly on-canvas, that visual
confirmation breaks even though the underlying win-condition math (which
only compares dragged `(x,y)` against `P.answer`, not against the target's
on-screen position) still works. The user specifically asked for adjusted
**numbers** (not a `range`/`center` change), so the fix belongs in
`PRESETS[1]` and `PRESETS[2]`'s `M`/`target`/`answer` triples, not the
canvas setup.

**When this gets picked up, the fix needs:**
- New `M`/`target` pairs for Examples 2 and 3 whose `target` sits
  comfortably inside `x: [-2, 10], y: [-3, 9]` (similar margin to
  Example 1's `(8, 5)`), while still giving a clean, easy-to-read integer
  `answer` (matching this module's established preference for
  presets with nice observable numbers/no ugly decimals) — same spirit as
  the k1:k2 ratio and Slide 1 "not a whole number" work above, just the
  opposite direction (these need to be *comfortably visible*, not
  deliberately awkward).
- Double-check `col1`/`col2` (the `M` columns) stay well inside the box
  too for whichever new matrices are chosen — not just the target.
- "Easier to drag" per the user's ask likely just falls out of this once
  everything relevant sits centrally in-frame rather than at/past an
  edge — no separate interaction change should be needed, but worth
  re-confirming by actually dragging each preset once implemented.
- Verify by loading each of the 3 presets and screenshotting the canvas
  to confirm the target dot and its label are fully visible, not just
  checking the raw numbers against the box math.

**Done.** Kept `M` unchanged for both presets (per the user's ask to fix
this via numbers, not the canvas box) and only changed `target`/`answer`:

- `PRESETS[1]` ("Example 2"): `M` unchanged (`col1=(1,1)`, `col2=(2,3)`,
  `det=1`). `target` changed from `(8, 11)` → `(5, 6)`; `answer` changed
  from `(2, 3)` → `(3, 1)`. New margins from the `x:[-2,10], y:[-3,9]`
  box: 5 (x) and 3 (y) — both comfortably inside, similar to Example 1.
- `PRESETS[2]` ("Example 3"): `M` unchanged (`col1=(3,1)`, `col2=(1,1)`,
  `det=2`). `target` changed from `(10, 6)` → `(6, 4)`; `answer` changed
  from `(2, 4)` → `(1, 3)`. New margins: 4 (x) and 5 (y).
- Both new `col1`/`col2`/`target` triples double-checked against the box
  (not just the target) — all comfortably inside with several units of
  margin on every side, matching Example 1's original spacing.

Verified via `node --check`, then Playwright: cycled through all three
presets and screenshotted each (confirmed both targets now render fully
on-canvas with clear margin, vs. Example 2 being invisible and Example 3
sitting on the edge before the fix); then simulated an actual mouse drag
of the green free point to each preset's exact answer (computed real
on-screen coordinates from the canvas's `range`/`center`/CSS-scaling math,
not just called internal functions) and logged all three trials — the
table showed `Example 1/2/3` each with target, dragged (x,y), ratio of
areas, and `✓ match`, all correct. Clicked through all 6 slides afterward
with zero console errors — no regressions elsewhere in the file. No
`matrix-lab.js` engine changes.

## `practice-cramers-rule-areas.html` Slide 2 — "then compare" is unclear, NOT YET FIXED

Raised after a user screenshot of Slide 2 ("Two more areas") that was
cropped right after the two mini-canvases, not showing the `#s2compare`
box further down the page — the user asked "compare what?" Explicitly
deferred: "บันทึกไว้ก่อน" (record it first). Do not edit
`practice-cramers-rule-areas.html` for this until asked.

**The actual bug, confirmed by loading the slide and reading the full
page (not just the cropped screenshot):** the lead paragraph says "Drag
to match the target again, then compare" but never says *what* to
compare *against what*. There are two things on the page that could
plausibly be "the two things to compare," and the instruction doesn't
disambiguate:

- The two mini-canvases ("for x: (target, ĵ)" and "for y: (î, target)")
  next to each other — a wrong but easy-to-default-to reading, since
  they're the two new things this slide just introduced and they sit
  side by side.
- The *actual* intended comparison: the `#s2compare` box below the
  mini-canvases, which shows "Your dragged (x, y)" (updates live as you
  drag the green point on the main canvas above) against "Ratio of areas
  (x, y)" (static — computed once from `target`/`col1`/`col2` via
  `signedArea()`, doesn't change as you drag at all). The intended
  "aha": once you finish dragging to match the target, "Your dragged"
  becomes identical to "Ratio of areas" — two completely different
  calculation methods (trial-and-error dragging vs. pure area ratios)
  landing on the exact same numbers. That's the surprise the facilitator
  note already names ("This is the moment of surprise, but resist
  naming it yet").

So this is a real instructional-copy gap, not just a one-off reading
comprehension slip — the sentence "then compare" needs to name its two
operands explicitly.

**When this gets picked up, the fix likely needs:**
- Reword the Slide 2 lead paragraph (and/or add a short pointer inside
  or near `#s2compare`) to name the comparison directly — something like
  "drag to match the target again, then check whether your answer
  matches the 'Ratio of areas' box below" rather than the bare "then
  compare."
- Consider whether `#s2compare`'s own labels ("Your dragged (x, y)" /
  "Ratio of areas (x, y)") could do more of this work themselves — e.g.
  a short inline note the first time they're shown ("these should
  match!") — so the comparison is legible even if someone lands on the
  box without having read the lead paragraph carefully.
- Not a layout/scrolling bug per se (the box does exist and does render
  correctly, confirmed via a full-page screenshot) — the copy is what
  needs to change, not scroll position or CSS.

---

## DONE — Module 5 `index.html` converted to slide mode

Converted the entire main course page (`index.html`, all 7 sections plus
the nine-activity workspace) from the long-scroll + tab-panel layout into
the same slide-deck UI pattern used by the standalone `practice-*.html`
files: sidebar with a numbered outline, bottom nav (prev/next round
buttons + page dots), mobile hamburger + full-screen overlay, keyboard
arrow-key navigation, and touch swipe. Edited `index.html` directly in
place, as requested (not a separate file). A full backup of the
pre-conversion file was kept at `index.pre-slide-mode-backup.html`.

**Slide breakdown (17 slides, indices 0–16):**
0 = Before you start · 1 = Objectives · 2 = Session flow · 3 = The big
idea · 4 = Readiness check (the old 7-question gate quiz) · 5–13 = the
nine activities, one per slide (Activity 1 … Activity 9) · 14 =
Reconnecting to the textbook · 15 = Extensions (Desmos/Mathigon/Graspable
Math) · 16 = Facilitator guide.

**New "locked slide" concept** (built fresh — there was no equivalent in
the existing slide-deck pattern, since the standalone practice files
never needed to gate anything): a locked slide shows a dimmed sidebar
entry with a small 🔒 badge, and its main content area shows a short
placeholder card ("🔒 This activity unlocks once you pass the readiness
check above." / "…once you've opened all nine activities at least
once.") with a "Go there →" button that jumps straight to the slide that
unlocks it, instead of the real content. Two lock groups:
- Slides 5–13 (the nine activities) — locked until the readiness-check
  slide's existing pass logic succeeds (all 3 prerequisite questions
  correct). Reused the existing `unlock()` function from the gate-quiz
  IIFE almost as-is — it now calls a small `window.__onGatePassed()`
  hook instead of toggling the old `#gateQuiz`/`#gateUnlocked` divs'
  `display` style.
- Slide 14 (Reconnecting) — locked until all nine activity slides have
  been visited at least once. Reused the same idea as the old `visited`
  Set/`checkAllVisited()` tab-tracking logic, rewritten inside the new
  slide-navigation code. One correctness fix made during testing: a
  slide only counts as "visited" toward this unlock if it was visited
  **while already unlocked** — clicking through the nine activity slides
  before passing the readiness check (to see their locked placeholders)
  must not silently satisfy the "visited all nine" condition before the
  quiz is even passed. Caught this with a Playwright test that
  deliberately clicked through the locked activities first, confirmed
  Reconnecting was still locked, then passed the gate, confirmed it was
  *still* locked until the nine activities were revisited for real.

**What was preserved 100% unchanged:** every one of the nine activities'
own HTML ids and self-contained `(function(){...})()` JS blocks, the
shared helper functions (`COLORS`, `roundTo2dp`, `applyMatTo`,
`solveSystem`, `fmtM`, `matrixHTML`, `colVectorHTML`, `pointsMatrixHTML`,
`makeToggle`), and the gate-quiz's own scoring logic (which 3 of the 7
questions gate, which 4 are formative-only). The old tab-switching IIFE
and the `.m5-nav`/`.m5-panel` CSS rules were removed/left as harmless
dead code respectively, since the new top-level slide system replaces
their job entirely.

**Layout adaptation from the practice-file reference pattern:** this
page (unlike the standalone practice files) has a persistent site header
and a hero banner above the activity content, so the sidebar uses
`position: sticky; top: 78px` inside a normal-flow `<main>` rather than
the practice files' fixed `100vh` app-shell — the page scrolls normally,
and the bottom nav is `position: sticky; bottom: 12px` so it stays
reachable regardless of how long an individual slide's content is.

**Verification performed:** `node --check` on the extracted script
(clean); a Playwright regression pass that clicked through all 17 slides
individually, confirmed activities 5–13 and slide 14 start locked,
answered the readiness-check quiz correctly and confirmed activities
unlock, visited all nine activities and confirmed Reconnecting unlocks,
tested prev/next buttons, page dots, keyboard arrow keys, and the mobile
hamburger + overlay (open and close) — all with zero console errors.
Also spot-checked that an actual activity's canvas/matrix rendering
still works correctly inside its new slide (Activity 5's det/area
readout updates as expected). A helper script,
`convert_slide_mode.py`, was written to perform the conversion
reproducibly from the original line layout, and both fixes found during
testing (the mobile-menu button's z-index losing to the sticky site
header, and the locked-slide visited-tracking bug above) were also
applied back into that script so it stays in sync with the shipped
`index.html`.

## v2 — splitting sidebar and slide-nav into two roles (Unit + sub-slide)

*Prompted by: a revised pedagogical-principles pass
(`teaching-principles-matrix-v2.md`, extending the original 7 principles
to 11, with an explicit gap list — Activity 2 had no win-detection,
Activity 6's check was necessary-but-not-sufficient, reflection was
concentrated only at the very end, "seeing the value" only showed up in
Activity 9) and an explicit request to stop conflating two different
kinds of navigation that the flat 17-slide deck (the "v1" work above) had
merged into one.*

**The architectural change:** the sidebar and the prev/next/dots nav now
have strictly separate jobs. The sidebar is the **Progression** — it
only ever jumps between the 17 top-level Units, never touches which
sub-slide is showing beyond restoring whichever one was last viewed in
that Unit (`subIndexByUnit`, a deliberate "resume where you left off"
map, not a bug). Prev/next/dots are the **flow inside a Unit** — bounded
to the current Unit's sub-slides, disabled at that Unit's own first/last
sub-slide, and never allowed to cross into the next Unit. Crossing Units
happens through exactly one control: a visually distinct
"Continue: {next unit} →" bridge button, placed only on a Unit's final
sub-slide, reusing the existing `data-jump` mechanism. This was scoped
to all 17 Units (not just the 9 activities), each broken into 2–5
sub-slides, per explicit confirmation.

**Content redesign, all 9 activities in one pass:** each activity now
ends its sub-slide flow with a lightweight concept-check rather than
just trailing off — 8 of the 9 use a new reusable multiple-choice widget
(`.mini-check`, bound via `bindMiniCheck(containerId, correctValue,
correctMsg, wrongMsg)`), Activity 9 keeps its own open-ended capstone
reflection since it already closes the whole arc. Four activities
(4–7) gained a short "why this matters" hook before their main
interaction, addressing the "seeing value only in Activity 9" gap. The
six purely-informational Units (0,1,2,3,14,15) gained a reflect
check-in (a prompt + a "💭 See a sample thought" reveal, `bindHint2`),
spreading reflection across the module instead of leaving it all at the
end. Two long-standing engine-level gaps were also closed directly in
the affected activities' JS: **Activity 2** (`p1`, "Match the Shape") had
no win-detection at all — `MatrixLab`'s `targetShape` is purely a drawn
outline — so an explicit distance-to-target check was added to its
`onMatrixChange`, showing a green "matches the target!" message when the
dragged matrix lands within `0.12` of the target's four entries.
**Activity 6** (`p5`, "The Undo Button") only checked that
`det(yours) × det(M) ≈ 1`, which is necessary but not sufficient for
"you found the actual inverse" (any matrix with the reciprocal
determinant passes); a second, stricter check comparing the dragged
matrix directly against the analytically-computed `M⁻¹` (entrywise,
within `0.1`) was added alongside the original det-product check, which
was left in place unchanged.

**Generation script:** `convert_unit_subslide_mode.py`, run on top of a
freshly-regenerated v1 file (i.e. the 3-step sequence
`cp index.pre-slide-mode-backup.html index.html` →
`convert_slide_mode.py` → `convert_unit_subslide_mode.py`, since both
scripts write `index.html` in place and are not idempotent against each
other's output). Three bugs were found and fixed during iterative
testing, each requiring that same 3-step regenerate-and-retest cycle:
an off-by-one line range left an original `<section>` tag unclosed in
Unit 16; the reflect-prompt helper wrapped its own `.subslide` div on
top of the one the shared `sub()` wrapper already added, duplicating
sub-slides and breaking index-driven active-state toggling; and the
gate-quiz Unit's first sub-slide opened both `.card` and `#gateQuiz` as
separate divs but only closed one, leaving `#gateQuiz` unclosed and
collapsing the second sub-slide's diagnostic-question inputs to
zero-size (fixed by merging `id="gateQuiz"` onto the single `.card` div).

**Verification performed:** div/section tag-balance check (429/429,
6/6), `node --check` on the extracted script (clean), and a full
Playwright pass confirming — per-Unit sub-slide counts match the
intended plan for all 17 Units; prev/next stay confined to a Unit and
disable correctly at its boundaries; the bridge button correctly crosses
a Unit boundary; the sidebar restores sub-slide 0 on a genuinely fresh
Unit; the gate-quiz, now split across 2 sub-slides, still scores
correctly end-to-end and unlocks the 9 activities; visiting all 9
post-unlock still unlocks Reconnecting; all 8 mini-checks give correct
and wrong feedback on click; all 4 hooks render; all 6 reflect-toggles
open their sample box; keyboard arrows and the mobile menu still work.
Both engine-gap fixes were verified with an actual simulated drag (not
just code inspection) — dispatching real `mousedown`/`mousemove`/
`mouseup` events computed from the canvas's world-to-screen mapping to
drag Activity 2's basis vectors onto the exact target shape (confirmed
the green "matches the target!" message appears) and Activity 6's basis
vectors onto the analytically-computed inverse (confirmed the green
"Exact match — this IS M⁻¹" message appears alongside the pre-existing
det-product check). Zero console/page errors throughout.
