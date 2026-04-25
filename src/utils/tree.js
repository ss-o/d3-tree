export function collapseNode(d) {
  if (d.children) {
    d._children = d.children;
    d._children.forEach(collapseNode);
    d.children = null;
  }
}

export function initializeRoot(rootNode, canvasHeight) {
  rootNode.x0 = canvasHeight / 2;
  rootNode.y0 = 0;
}

export function toggle(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

export function collapseExceptPath(rootNode, targetNode) {
  const onPath = new Set();
  let cursor = targetNode;
  while (cursor) {
    onPath.add(cursor);
    cursor = cursor.parent;
  }

  function walk(d) {
    if (!d.children) return;
    d.children.forEach((child) => {
      if (onPath.has(child)) {
        walk(child);
      } else {
        collapseNode(child);
      }
    });
  }

  walk(rootNode);
}

export function expandToNodes(nodes) {
  nodes.forEach((node) => {
    let current = node.parent;
    while (current) {
      if (current._children) {
        current.children = current._children;
        current._children = null;
      }
      current = current.parent;
    }
  });
}
