# Design Spec: Minimalist Tree & Legibility Fix
Date: 2025-04-25

## Goal
Improve the user experience by removing unnecessary UI elements (context menu) and fixing legibility issues caused by low-contrast color choices (cyan glow vs cyan text).

## 1. Interaction Cleanup
- **Remove Context Menu Logic**: Delete `showContextMenu` and its helper listeners in `src/main.js`.
- **Remove HTML Node**: Remove `<div id="context-menu" ...>` from `index.html`.
- **Remove Styles**: Delete `.context-menu` and `.context-menu-item` from `src/styles/main.css`.

## 2. Legibility Optimization
- **Glow Intensity**: Reduce the opacity of cyan glows.
  - Change `drop-shadow(0 0 8px var(--accent))` to use a semi-transparent version (e.g., `rgba(88, 217, 240, 0.5)`).
- **Text Contrast**: 
  - Strengthen the dark `text-shadow` on node labels to ensure separation from the background glow.
  - Maintain white/light-grey text on hover rather than switching to cyan, keeping the contrast high against the glow.

## 3. Success Criteria
- Right-clicking a node no longer triggers a custom menu.
- Node labels are clearly readable even when the node is "glowing" or selected.
- No dead code or unused HTML elements remain.
