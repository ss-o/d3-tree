import { test } from "node:test";
import assert from "node:assert/strict";

import {
  collapseNode,
  collapseExceptPath,
  initializeRoot,
  toggle,
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
