# Interactive Mathematics Course — QITEP / SEAQiM, Yogyakarta 2026

This is your website's source code, for the guest lecture series 4–8 August 2026.
This README is written for someone who has **never built a website before** — it
explains what every file does, how the Desmos/Mathigon/Graspable Math embeds
work, and how to publish the site so participants can open it from a link.

---

## 1. The 30-second mental model

A website is just a folder of files that a browser knows how to read:

- **`.html` files** — the content and structure (like the "Word document").
- **`.css` files** — the visual styling (colors, spacing, fonts).
- **`.js` files** — the behavior (what happens when you click, drag, load a page).

There is no "compiling" or "building" step for this project — you can literally
double-click any `index.html` file right now and it opens in your browser. That's
the whole trick. Everything else in this README is about (a) understanding what's
already there and (b) getting a shareable link.

## 2. Folder structure

```
qitep-math-site/
├── index.html                              ← the homepage
├── assets/
│   ├── css/style.css                       ← ALL shared visual styling lives here
│   └── js/
│       ├── main.js                         ← shared behavior (nav highlight, embed fallback)
│       └── config.js                       ← the one place to paste your free Desmos API key
├── modules/
│   ├── module-1-problem-solving/index.html
│   ├── module-2-equity-social-justice/index.html
│   ├── module-3-tpack/index.html
│   ├── module-4-algebra-apps-1/index.html  ← the finished example module — study this one
│   └── module-5-geometry-apps-2/index.html
└── README.md                               ← this file
```

Every module page loads the **same** `style.css` and `main.js` via a relative
path like `../../assets/css/style.css`. That means: change one CSS rule, and it
updates on all six pages at once. This is the single most important idea in the
whole project — **shared files, not copy-pasted styling.**

## 3. How Module 4 was built (the pattern to copy for Modules 1, 2, 3, 5)

Open `modules/module-4-algebra-apps-1/index.html` in a text editor and you'll see
it's organized top-to-bottom as numbered `<section>` blocks: objectives, session
timeline, big idea, formula, three tool embeds, facilitator guide, resources.
Each section is independent — you can reorder, delete, or duplicate them freely.

To build a new module:

1. Copy the whole `module-4-algebra-apps-1` folder, rename it (e.g. `module-1-problem-solving` — already scaffolded for you).
2. Edit the text inside each `<section>`.
3. Delete or keep the embed blocks depending on whether that module uses Desmos/Polypad/Graspable Math.
4. Update the `<title>`, the hero banner text, and the date/time chips.

## 4. How the three tool embeds work

### Desmos (easiest — no coding)
Any graph or construction you build at [desmos.com/geometry](https://www.desmos.com/geometry)
or [desmos.com/calculator](https://www.desmos.com/calculator) has a **Share → Embed**
button that gives you a ready-made `<iframe>` snippet. That's exactly what
Module 4's first Desmos block uses — copy your own snippet into any module the
same way.

There's also an *optional advanced* version in Module 4 built with the real
Desmos JavaScript API (search the file for `Desmos.GraphingCalculator`), which
lets you script the calculator instead of just displaying a fixed saved graph.
It needs a free API key:

1. Go to <https://www.desmos.com/my-api> and request a key (free, meant for teachers/developers).
2. Open `assets/js/config.js` and paste it in.
3. Reload the page — the advanced demo turns on automatically. Until you add a
   key, the page shows a friendly "add your key" message instead of breaking.

### Mathigon / Polypad
Mathigon's Polypad tool is now hosted by Amplify at `polypad.amplify.com`
(the free tool itself hasn't changed). There is no simple "Share → Embed"
button like Desmos, so Module 4 includes Polypad's own JavaScript library
directly and calls `Polypad.create(...)` to draw a canvas on the page. If that
ever stops working (Mathigon does update their library version numbers from
time to time), the page automatically falls back to a button that opens Polypad
in a new tab — nothing breaks for participants either way.

### Graspable Math
Graspable Math provides a small developer script (`gm-inject.js`) documented at
their [GM API GitHub project](https://github.com/eweitnauer/gm-api). Module 4
loads it and creates a draggable equation canvas with `gmath.Canvas(...)`. Same
safety net: if it fails to load, participants see a button to open Graspable
Math directly instead.

### Why every embed has a fallback
All three of these are external services outside our control — a slow venue
wifi, a temporary outage, or a school network that blocks iframes can all cause
an embed to fail to load. Rather than showing participants a blank box, every
embed on this site follows the same pattern (see `watchEmbed()` in
`assets/js/main.js`): try to load it, wait a few seconds, and if it doesn't
succeed, show a clear message with a button that opens the same tool in a new
tab. This is standard practice for any website that depends on third-party
tools — build for the failure case, not just the happy path.

One honest limitation: browsers don't allow a page to inspect *why* an iframe
from another website failed (a security feature, not a bug), so the automatic
fallback can't catch every possible failure — for example a network that
silently blocks `desmos.com` entirely might show a blank box without
triggering the fallback message. That's why every embed also keeps a plain
"Open in Desmos/Polypad/Graspable Math ↗" link visible in its header at all
times, so there's always a manual way out.

## 5. Publishing the site to a shareable link (GitHub Pages)

GitHub Pages is a free way to host a plain HTML/CSS/JS site like this one at a
public URL (something like `https://yourusername.github.io/qitep-math-site/`).
No purchase, no server to manage.

1. **Create a free GitHub account** at <https://github.com/join> if you don't have one.
2. **Create a new repository** — click the "+" in the top right → "New repository" →
   name it `qitep-math-site` → keep it Public → click "Create repository."
3. **Upload the files** — on the new repository's page, click "uploading an
   existing file," then drag in the entire contents of this `qitep-math-site`
   folder (keeping the `assets/` and `modules/` folders intact), and click
   "Commit changes."
4. **Turn on Pages** — go to the repository's **Settings** tab → **Pages** in
   the left sidebar → under "Branch," choose `main` and folder `/ (root)` →
   click **Save**.
5. Wait about a minute, then refresh that Settings → Pages screen — GitHub will
   show you the live link, typically
   `https://<your-username>.github.io/qitep-math-site/`.
6. That link is what you share with participants. Any time you want to update
   the content, upload the changed file again the same way (Step 3) — the live
   site updates automatically within a minute or two.

If you'd like, next session we can walk through this together step by step
while sharing your screen, or set it up so updates happen automatically instead
of manual uploads (this uses a tool called "git," which is the next natural
thing to learn after this).

## 6. Opening the site locally without publishing it

While you're still editing, you don't need the internet at all to preview your
work: just double-click `index.html` (or any module's `index.html`) and it
opens directly in your browser from your own computer. The only things that
need internet are the Desmos/Mathigon/Graspable Math embeds themselves.

## 7. What's built vs. what's next

| Module | Status |
|---|---|
| Home page | ✅ Done |
| Module 4 — Algebra with Apps (Part 1) | ✅ Full lesson built (the reference example) |
| Module 1 — Problem Solving | 🚧 Outline drafted, content session pending |
| Module 2 — Equity & Social Justice | 🚧 Outline drafted, content session pending |
| Module 3 — TPACK | 🚧 Outline drafted, content session pending |
| Module 5 — Geometry with Apps (Part 2) | 🚧 Outline drafted, content session pending |
| Deployed to a live link | 🚧 Follow Section 5 above, or ask Claude to walk through it live |
