# Fix Node Glow Clipping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the "square-ish" glow artifact around nodes by expanding the SVG filter region and switching from CSS shorthand `drop-shadow` to a robust SVG filter.

**Architecture:** We will update the SVG `<filter>` definition in `index.html` to have a much larger rendering region (x, y, width, height) to prevent clipping. We will then update `src/styles/main.css` to use `filter: url(#neon-glow)` instead of `drop-shadow()`, which is prone to boxy artifacts on some hardware.

**Tech Stack:** HTML, CSS, SVG Filters

---

### Task 1: Expand SVG Filter Region

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update `neon-glow` filter bounds**
  Expand the filter region from 20% to 100% margin to prevent clipping on low-end hardware or software renderers.

```html
<!-- In index.html, find <filter id="neon-glow" ...> -->
<filter id="neon-glow" x="-100%" y="-100%" width="300%" height="300%">
```

- [ ] **Step 2: Add a secondary filter for animations**
  We'll add a `neon-glow-pulse` filter that we can use for the pulsing animation to keep it distinct from the static hover glow if needed.

```html
<filter id="neon-glow-pulse" x="-100%" y="-100%" width="300%" height="300%">
  <feGaussianBlur stdDeviation="6" result="blur">
    <animate attributeName="stdDeviation" values="4;8;4" dur="2.4s" repeatCount="indefinite" />
  </feGaussianBlur>
  <feMerge>
    <feMergeNode in="blur" />
    <feMergeNode in="SourceGraphic" />
  </feMerge>
</filter>
```

- [ ] **Step 3: Commit**
```bash
git add index.html
git commit -m "style: expand SVG filter region to fix glow clipping"
```

### Task 2: Update CSS to use SVG Filters

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: Replace CSS `drop-shadow` with `url(#neon-glow)`**
  Update the `.node:hover circle`, `.node.is-selected circle`, and `.vault-core` to use the defined SVG filter.

```css
/* Update .node:hover circle */
.node:hover circle {
  filter: url(#neon-glow);
  stroke: var(--accent);
}

/* Update .node.is-selected circle */
.node.is-selected circle {
  stroke: white;
  stroke-width: 3px;
  filter: url(#neon-glow);
}

/* Update .vault-core */
.vault-core {
  animation: vault-pulse 2s ease-in-out infinite alternate;
  filter: url(#neon-glow);
}
```

- [ ] **Step 2: Update `path-pulse` animation**
  Instead of changing filters in the keyframes (which is expensive and causes flickering), we'll use the pre-animated filter or just animate the opacity/scale of the glow. Actually, since we added `neon-glow-pulse` with an internal animation, we can just apply it.

```css
/* Update .node--on-path circle */
.node--on-path circle {
  filter: url(#neon-glow-pulse);
}

/* Remove or simplify @keyframes path-pulse since the filter handles it */
@keyframes path-pulse {
  /* We can leave this empty or remove it if not used elsewhere */
}
```

- [ ] **Step 3: Commit**
```bash
git add src/styles/main.css
git commit -m "style: switch to SVG filters for smoother neon glows"
```

### Task 3: Final Verification

- [ ] **Step 1: Check UI in browser**
  Hover over nodes and verify the glow is now perfectly circular/smooth without square edges.

- [ ] **Step 2: Run existing tests**
```bash
npm test
```
