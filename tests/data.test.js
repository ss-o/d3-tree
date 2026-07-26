import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collectNodes,
  collapseNode,
  collapseExceptPath,
  expandToNodes,
  initializeRoot,
  toggle,
  findMatches,
  getSiblings,
} from "../src/utils/tree.js";

test("collapseNode collapses children recursively", () => {
  const tree = {
    name: "root",
    children: [
      {
        name: "child-1",
        children: [{ name: "grandchild-1", children: [{ name: "leaf" }] }],
      },
      { name: "child-2" },
    ],
  };

  collapseNode(tree);

  assert.strictEqual(tree.children, null);
  assert.ok(Array.isArray(tree._children));
  assert.strictEqual(tree._children[0].children, null);
  assert.ok(Array.isArray(tree._children[0]._children));
  assert.strictEqual(tree._children[0]._children[0].children, null);
  assert.ok(Array.isArray(tree._children[0]._children[0]._children));
});

test("collapseNode leaves nodes without children unchanged", () => {
  const node = { name: "leaf" };

  collapseNode(node);

  assert.deepEqual(node, { name: "leaf" });
});

test("initializeRoot sets x0 and y0", () => {
  const root = { name: "root" };

  initializeRoot(root, 800);

  assert.strictEqual(root.x0, 400);
  assert.strictEqual(root.y0, 0);
});

test("initializeRoot computes midpoint for different heights", () => {
  const root = { name: "root" };

  initializeRoot(root, 650);

  assert.strictEqual(root.x0, 325);
  assert.strictEqual(root.y0, 0);
});

test("toggle collapses node with children", () => {
  const node = {
    children: [{ name: "child" }],
  };

  toggle(node);

  assert.strictEqual(node.children, null);
  assert.deepEqual(node._children, [{ name: "child" }]);
});

test("toggle expands node with hidden children", () => {
  const node = {
    _children: [{ name: "child" }],
  };

  toggle(node);

  assert.deepEqual(node.children, [{ name: "child" }]);
  assert.strictEqual(node._children, null);
});

test("collapseExceptPath collapses siblings of ancestors", () => {
  const target = {
    children: null,
    _children: [{ name: "leaf" }],
    parent: null,
  };
  const A = { children: [target], _children: null, parent: null };
  const B = { children: [{ name: "b-leaf" }], _children: null, parent: null };
  const root = { children: [A, B], _children: null, parent: null };
  A.parent = root;
  B.parent = root;
  target.parent = A;

  collapseExceptPath(root, target);

  assert.ok(Array.isArray(A.children), "A (on path) stays expanded");
  assert.strictEqual(B.children, null, "B (off path) is collapsed");
  assert.ok(Array.isArray(B._children), "B._children populated after collapse");
  assert.strictEqual(target.children, null, "target itself is unchanged");
  assert.ok(Array.isArray(target._children), "target._children intact");
});

test("collapseExceptPath leaves single-path ancestor chain open", () => {
  const target = {
    children: null,
    _children: [{ name: "leaf" }],
    parent: null,
  };
  const A = { children: [target], _children: null, parent: null };
  const root = { children: [A], _children: null, parent: null };
  A.parent = root;
  target.parent = A;

  collapseExceptPath(root, target);

  assert.ok(Array.isArray(root.children), "root stays expanded");
  assert.ok(Array.isArray(A.children), "A stays expanded");
  assert.strictEqual(
    target.children,
    null,
    "target unchanged (still collapsed)",
  );
  assert.ok(Array.isArray(target._children), "target._children intact");
});

test("collectNodes includes collapsed descendants for search", () => {
  const visibleBranch = {
    data: { name: "Visible Branch" },
    children: null,
    _children: null,
  };
  const hiddenLeaf = {
    data: { name: "Hidden Leaf", description: "reachable through search" },
    children: null,
    _children: null,
  };
  const collapsedBranch = {
    data: { name: "Collapsed Branch" },
    children: null,
    _children: [hiddenLeaf],
  };
  const root = {
    data: { name: "Root" },
    children: [visibleBranch, collapsedBranch],
    _children: null,
  };

  const nodes = collectNodes(root);
  const matches = findMatches(nodes, "reachable");

  assert.deepEqual(
    nodes.map((node) => node.data.name),
    ["Root", "Visible Branch", "Collapsed Branch", "Hidden Leaf"],
  );
  assert.strictEqual(matches.length, 1);
  assert.strictEqual(matches[0].data.name, "Hidden Leaf");
});

test("expandToNodes opens collapsed ancestors for matched nodes", () => {
  const leaf = {
    data: { name: "Leaf" },
    children: null,
    _children: null,
    parent: null,
  };
  const branch = {
    data: { name: "Branch" },
    children: null,
    _children: [leaf],
    parent: null,
  };
  const root = {
    data: { name: "Root" },
    children: [branch],
    _children: null,
    parent: null,
  };
  branch.parent = root;
  leaf.parent = branch;

  expandToNodes([leaf]);

  assert.deepEqual(branch.children, [leaf]);
  assert.strictEqual(branch._children, null);
});

test("findMatches searches by name and description (case-insensitive)", () => {
  const nodes = [
    { data: { name: "Apple", description: "A red fruit" } },
    { data: { name: "Banana", description: "A yellow fruit" } },
    { data: { name: "Cherry", description: "Small and sweet" } },
    { data: { name: "Date", description: "From a palm tree" } },
  ];

  // Search by name
  const nameMatches = findMatches(nodes, "apple");
  assert.strictEqual(nameMatches.length, 1);
  assert.strictEqual(nameMatches[0].data.name, "Apple");

  // Search by description
  const descMatches = findMatches(nodes, "fruit");
  assert.strictEqual(descMatches.length, 2);

  // Case insensitive
  const caseMatches = findMatches(nodes, "SWEET");
  assert.strictEqual(caseMatches.length, 1);
  assert.strictEqual(caseMatches[0].data.name, "Cherry");

  // No results
  const noMatches = findMatches(nodes, "zucchini");
  assert.strictEqual(noMatches.length, 0);
});

test("getSiblings returns the root wrapped in an array when node has no parent", () => {
  const root = { name: "root", parent: null };

  const siblings = getSiblings(root, root);

  assert.deepEqual(siblings, [root]);
});

test("getSiblings returns visible children of the parent", () => {
  const a = { name: "a" };
  const b = { name: "b" };
  const parent = { name: "parent", children: [a, b], _children: null };
  a.parent = parent;
  b.parent = parent;

  assert.deepEqual(getSiblings(parent, a), [a, b]);
  assert.deepEqual(getSiblings(parent, b), [a, b]);
});

test("getSiblings falls back to hidden children when parent is collapsed", () => {
  const a = { name: "a" };
  const b = { name: "b" };
  const parent = { name: "parent", children: null, _children: [a, b] };
  a.parent = parent;
  b.parent = parent;

  assert.deepEqual(getSiblings(parent, a), [a, b]);
});

test("getSiblings returns an empty array when parent has no visible children", () => {
  const a = { name: "a" };
  const parent = { name: "parent", children: null, _children: null };
  a.parent = parent;

  assert.deepEqual(getSiblings(parent, a), []);
});
