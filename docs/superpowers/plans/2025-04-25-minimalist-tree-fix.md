# Minimalist Tree & Legibility Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the context menu and improve node label legibility by adjusting glows and text shadows.

**Architecture:** We will surgically remove context menu code from JS, HTML, and CSS. We will then update CSS variables and rules to improve contrast and readability of labels against glowing nodes.

**Tech Stack:** HTML, CSS, JavaScript (D3.js)

---

### Task 1: Remove Context Menu Logic

**Files:**
- Modify: `src/main.js`
- Modify: `index.html`

- [ ] **Step 1: Delete `showContextMenu` function and its usages in `src/main.js`**
  Remove the `showContextMenu` function definition and the `.on("contextmenu", ...)` listener in the `update` function.

```javascript
// Remove this from update(source)
.on("contextmenu", (event, d) => showContextMenu(event, d));

// Delete the entire showContextMenu function
function showContextMenu(event, d) { ... }
```

- [ ] **Step 2: Remove context menu div from `index.html`**
  Find and remove `<div id="context-menu" class="context-menu" style="display: none"></div>`.

- [ ] **Step 3: Commit**
```bash
git add src/main.js index.html
git commit -m "feat: remove context menu logic and html"
```

### Task 2: Remove Context Menu Styles

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: Delete context menu styles**
  Remove `.context-menu` and `.context-menu-item` blocks from the CSS file.

- [ ] **Step 2: Commit**
```bash
git add src/styles/main.css
git commit -m "style: remove context menu styles"
```

### Task 3: Optimize Node Legibility

**Files:**
- Modify: `src/styles/main.css`

- [ ] **Step 1: Reduce glow opacity for nodes**
  Update hover and path-pulse states to use semi-transparent cyan instead of solid.

```css
/* Update .node:hover circle */
filter: drop-shadow(0 0 8px rgba(88, 217, 240, 0.5)) drop-shadow(0 0 2px rgba(88, 217, 240, 0.3));

/* Update @keyframes path-pulse */
0%, 100% { filter: drop-shadow(0 0 4px rgba(88, 217, 240, 0.4)); }
50% { filter: drop-shadow(0 0 12px rgba(88, 217, 240, 0.6)) drop-shadow(0 0 3px rgba(88, 217, 240, 0.3)); }
```

- [ ] **Step 2: Strengthen text-shadow for labels**
  Increase the density of the dark shadow behind node text.

```css
/* Update .node text */
text-shadow: 
  0 0 4px rgba(0, 0, 0, 1),
  0 0 8px rgba(0, 0, 0, 0.9),
  0 0 2px var(--bg);
```

- [ ] **Step 3: Fix hover color contrast**
  Prevent text from turning cyan on hover to keep it white/high-contrast.

```css
/* Update .node:hover text */
.node:hover text {
  fill: var(--fg); /* Keep it light color instead of var(--accent) */
  text-shadow: 
    0 0 8px rgba(0, 0, 0, 1),
    0 0 2px var(--bg);
}
```

- [ ] **Step 4: Commit**
```bash
git add src/styles/main.css
git commit -m "style: improve node legibility with subtle glows and stronger text shadows"
```

### Task 4: Final Verification

- [ ] **Step 1: Verify right-click is gone**
  Open the browser and right-click a node. The custom menu should not appear.

- [ ] **Step 2: Verify legibility**
  Hover over nodes and check if text remains clear and readable even with the glow.

- [ ] **Step 3: Run existing tests**
```bash
npm test
```
