---
version: 1
slug: "prototypes-home-index-html"
primary_target: "prototypes/home/index.html"
related_targets: ["prototypes/start/index.html","prototypes/plans/index.html","prototypes/history/index.html","prototypes/progress/index.html","prototypes/me/index.html","prototypes/index.html"]
---

# App shell and the out-of-session slices (prototypes)

## Scope
- Mode: **Operate**. Every screen outside a running workout: Today, Plans, History, Progress, Me, plus sign-in and onboarding. Build path: code-led (operate surface; harness has no image generation).
- Output: one standalone prototype per vertical slice, `prototypes/<slice>/index.html`, sharing `prototypes/shared/{base.css,kit.js,data.js}`; `prototypes/index.html` maps slices to use cases. Workout log (`prototypes/workout-log/`) is untouched.
- Copy is English with en-US number formatting, matching the committed workout-log prototype (user decision, 18/11/2026). PRODUCT.md/DESIGN.md still say Vietnamese; flagged, not changed.
- States every slice exposes in its demo panel: offline, unsynced changes, workout in progress (resume bar), empty, error/loading where data comes from the server.
- Must keep: sync pill on every signed-in screen; resume bar whenever a session is open; iOS "Add to Home Screen" hint non-blocking before a workout; update prompt never reloads mid-session; R1 gives a direction never a number; R8 never guesses a starting weight; every suggestion shows its reason and can be dismissed; streak paused during deload; volume counted in sets; e1RM compared only within one load input; weeks Monday to Sunday.

## Direction contract
THESIS: Outside the workout, the plan is a wallet of race bibs: each plan day is a bib you swipe sideways, the next one already centered and one tap from Start; everything else sits behind a plain five-item tab bar. Refuses the category's dashboard-of-cards home (rings, badges, a hero metric) and a hidden hamburger.

OWN-WORLD: Inherits DESIGN.md unchanged: Tyvek ground #E6E6E1, bibs #F4F4F1, ink #111, orange #FF4F1A only for "next / happening / pressable", blue only for rest, green only for done/synced. Barlow Condensed 800 numerals, Be Vietnam Pro text, three sizes plus the 28px numeral, one bib-size element per screen at most. Perforation splits a bib's plan from its stub; bands carry state (orange next, ink-outline others, ink for records). Charts use ink, orange highlight and rule only.

STORY: The lifter opens the app, sees this week's Mon–Sun line and the next day's bib with its one-line suggestion, and taps Start with the thumb. Any other day is a swipe away. History, progress and goals are where they expect, one tab each.

FIRST VIEWPORT (390×844, Today): top bar Today + date + sync pill; week line of seven 32×38 day cells (done inked, today orange outline) with "1/3 · 2-week streak"; bib wallet: Push A bib full width with orange band "PUSH A · NEXT UP / DAY 1", numbered exercises with sets × range, superset label, meta line, perforation, suggestion tip (orange tint) with reason and "Got it"; neighbours peek at both edges; pager dots; 64px orange "Start Push A"; tab bar Today / Plans / History / Progress / Me. Signature interaction: swiping the wallet re-targets the Start button ("Start Pull A" turns ink when not the next day). Motion: snap scroll, short vertical slides 0.24–0.28s, no bounce, reduced-motion respected.

FORM: Bib wallet + bottom tabs, fused by the user's steer from dealt structures 4 (bib wallet) and 2 (week first + bottom tabs) of my seven. seed:7771fe5b2639cba7. User-steered pin: "kết hợp option B và C … bib wallet ở B và bottom tabs thì sẽ familiar với users hơn".

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Memorable moment
Swiping the plan's bibs and watching the Start button rename itself to the day under your thumb.

## Unresolved
- Product name and logo (working name "Fitness").
- Vietnamese vs English UI: PRODUCT.md says Vietnamese; prototypes follow the English workout-log.
- DESIGN.md "no tab bar" rule needs updating for out-of-session screens.
