# Sidenote prototypes

Throwaway harnesses, kept for the record. These are **not** shipped code and are not
wired into the site — each is a standalone HTML file you can open directly. They are
committed here so the sequence of attempts stays legible instead of living in a
temp directory that gets cleared.

Each file renders a self-check panel below the article: `ok` / `FAIL` lines with the
measured numbers that justify them. Open at various widths to see both the
two-column and the stacked-footnote behaviour.

| File | What it is | Verdict |
| --- | --- | --- |
| `1-runtime-js-and-clone.html` | Attempt A/B: notes injected per-paragraph, runtime JS with `getBoundingClientRect` per note, footnote content cloned into a `.sidenote` div. | Rejected — interleaved reads and writes gave `O(N×M)` forced reflows; cloned content broke mobile reading order and duplicated text on copy. |
| `4-grid-batched-js.html` | The design that shipped: real two-column grid, JS owns the breakpoint via a `.sidenotes` class on `<html>`, one batched read pass then one batched write pass. | Kept. |
| `5-grid-a11y-fixes.html` | The same grid with the accessibility pass applied: `role="list"`, `aria-label` on the landmark, visually-hidden heading, named number links, duplicate back-arrow removed from the tab order and from the a11y tree, `:target` / `:focus-within` feedback. | Kept. |
| `6-scale-and-reflow-bench.html` | Load generator that times the shipped `layout()` at 4 / 50 / 200 / 500 notes and instruments `getBoundingClientRect` + `offsetHeight` to count read-after-write interleavings. | Kept as the perf regression check. |

## Things that were true failures worth remembering

- **A CSS media query and a JS `matchMedia` can disagree.** At 1056px the CSS said
  wide while the JS said narrow, so notes went `position: absolute` with no `top` and
  piled at the top of the column. The fix was structural, not a synced constant: JS
  owns the breakpoint and tells CSS through a class, so there is no second source of
  truth to drift.
- **The breakpoint is 66rem, not 64rem.** `70ch + 24rem + 1.5rem` is 1012px, and with
  the body's 1.25rem padding that needs 1052px. 64rem (1024px) overflows.
- **A note on the *first* paragraph collides with a visible "Notes" heading.** Only
  surfaced once the probe put a note on paragraph one; testing notes on the second
  paragraph and later never hit it. The heading is now visually hidden and the
  `<aside>` carries `aria-label` instead.
- **`list-style: none` on a real `<ol>` strips the list role** in Safari/VoiceOver,
  losing the item count. `role="list"` puts it back.
- **Two links to the same target get announced twice.** The visible number and the
  native `↩` both targeted the reference. The arrow is now `aria-hidden` and
  `tabindex="-1"`; the number is the single real control.
- **A left-floated note cannot avoid widening or gapping the main column.** Not
  "sometimes gapped" — it is structurally impossible to avoid, because a float is in
  the same flow. `display: flow-root` papers over the symptom and creates dead space
  after tall notes.

## Measured results

Shipped runtime: 1132 bytes raw, 577 bytes gzipped, 28 lines, zero dependencies,
zero network requests.

Zero forced reflows at 4, 50, 200 and 500 notes — all `2N` reads are batched ahead of
all `N` writes. Cost is linear, not quadratic: 10× the notes costs 4.6× the time.
