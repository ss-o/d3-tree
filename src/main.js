import * as d3 from "d3";
import {
  collapseNode,
  collapseExceptPath,
  initializeRoot,
  toggle,
  expandToNodes,
  findMatches,
} from "./utils/tree.js";

let width,
  height,
  i = 0,
  duration = 350,
  root,
  selectedNode = null;

let manualMode = false;
let fitTimer = null;
let focusMode = true;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("search-input").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      resetHighlight();
      return;
    }

    const nodes = root.descendants();
    const matches = findMatches(nodes, term);

    if (matches.length > 0) {
      expandToNodes(matches);
      update(root);

      const matchIds = matches.map((m) => m.id);
      g.selectAll("g.node").style("opacity", (d) =>
        matchIds.includes(d.id) ? 1 : 0.2,
      );
      g.selectAll("path.link").style("opacity", 0.1);
    } else {
      g.selectAll("g.node").style("opacity", 0.2);
      g.selectAll("path.link").style("opacity", 0.1);
    }
  });

  document.getElementById("reset-btn").addEventListener("click", () => {
    document.getElementById("search-input").value = "";
    resetHighlight();

    if (root.children) {
      root.children.forEach(collapseNode);
    }
    update(root);
    fitToView(true);
  });
});

const tree = d3.tree().nodeSize([24, 220]);
const svg = d3.select("#body").append("svg");
const g = svg.append("g");
const tooltip = d3.select("#tooltip");

// Zoom setup
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 3])
  .on("zoom", (event) => {
    if (event.sourceEvent) manualMode = true;
    g.attr("transform", event.transform);
  });

svg.call(zoom);

function updateSize() {
  width = window.innerWidth;
  height = window.innerHeight;
  svg.attr("width", width).attr("height", height);
}

window.addEventListener("resize", () => {
  manualMode = false;
  updateSize();
  if (root) update(root);
});

const modeBtn = document.getElementById("mode-btn");
modeBtn.addEventListener("click", () => {
  focusMode = !focusMode;
  modeBtn.textContent = focusMode ? "Focus" : "Multi";
  modeBtn.classList.toggle("is-active", !focusMode);
});

const legendBtn = document.getElementById("legend-btn");
const legendEl = document.querySelector(".legend");
legendBtn.addEventListener("click", () => {
  const visible = legendEl.classList.toggle("is-visible");
  legendBtn.classList.toggle("is-active", visible);
});

function selectNode(d) {
  selectedNode = d;
  g.selectAll("g.node").classed("is-selected", (n) => n.id === d.id);
  highlightPath(d);
}

function showContextMenu(event, d) {
  event.preventDefault();
  d3.selectAll(".context-menu").remove();

  const menu = d3
    .select("body")
    .append("div")
    .attr("class", "context-menu")
    .style("left", event.pageX + "px")
    .style("top", event.pageY + "px");

  menu
    .append("div")
    .attr("class", "context-menu-item")
    .text("Focus Branch")
    .on("click", () => {
      collapseExceptPath(root, d);
      update(d);
      menu.remove();
    });

  menu
    .append("div")
    .attr("class", "context-menu-item")
    .text("Expand All")
    .on("click", () => {
      const expandAll = (n) => {
        if (n._children) {
          n.children = n._children;
          n._children = null;
        }
        if (n.children) n.children.forEach(expandAll);
      };
      expandAll(d);
      update(d);
      menu.remove();
    });

  menu
    .append("div")
    .attr("class", "context-menu-item")
    .text("Copy Link")
    .on("click", () => {
      if (d.data.url) {
        navigator.clipboard.writeText(d.data.url);
      }
      menu.remove();
    });

  d3.select("body").on("click.context-menu", () => {
    menu.remove();
  });
}

window.addEventListener("keydown", (e) => {
  if (!selectedNode) return;

  switch (e.key) {
    case "ArrowUp": {
      const siblings = selectedNode.parent
        ? selectedNode.parent.children || selectedNode.parent._children
        : [root];
      const idx = siblings.indexOf(selectedNode);
      if (idx > 0) selectNode(siblings[idx - 1]);
      break;
    }
    case "ArrowDown": {
      const siblings = selectedNode.parent
        ? selectedNode.parent.children || selectedNode.parent._children
        : [root];
      const idx = siblings.indexOf(selectedNode);
      if (idx < siblings.length - 1) selectNode(siblings[idx + 1]);
      break;
    }
    case "ArrowRight":
      if (selectedNode._children) {
        toggle(selectedNode);
        update(selectedNode);
      } else if (selectedNode.children) {
        selectNode(selectedNode.children[0]);
      }
      break;
    case "ArrowLeft":
      if (selectedNode.parent) selectNode(selectedNode.parent);
      break;
    case "Enter":
      toggle(selectedNode);
      update(selectedNode);
      break;
    case " ":
      e.preventDefault();
      if (selectedNode.data.url) window.open(selectedNode.data.url, "_blank");
      break;
  }
});

updateSize();

d3.json("data.json")
  .then((data) => {
    root = d3.hierarchy(data);
    initializeRoot(root, height);

    if (root.children) {
      root.children.forEach(collapseNode);
    }

    selectedNode = root;
    update(root);

    // Automated reveal
    d3.select("#body svg").classed("revealed", true);
    d3.select(".controls-overlay")
      .classed("revealed", true)
      .style("display", "flex");
    d3.select(".btn-group").classed("revealed", true);

    fitToView(true);
  })
  .catch((err) => {
    console.error("Error loading data:", err);
    d3.select("#body").append("div").attr("class", "error-overlay").html(`
        <div class="error-content">
          <h3>Failed to load data</h3>
          <p>${err.message}</p>
          <p>Make sure you are serving the project via a web server (e.g. Vite or Live Server) and that <code>data.json</code> exists.</p>
        </div>
      `);
  });

function fitToView(animate = true) {
  const bbox = g.node().getBBox();
  if (!bbox.width || !bbox.height) return;

  const currentWidth = window.innerWidth;
  const currentHeight = window.innerHeight;

  const paddingTop = 120;
  const paddingSides = 60;
  const paddingBottom = 60;

  const availableWidth = currentWidth - paddingSides * 2;
  const availableHeight = currentHeight - paddingTop - paddingBottom;

  const k = Math.min(
    availableWidth / bbox.width,
    availableHeight / bbox.height,
  );

  // Center within the available space (considering the top offset)
  const tx = paddingSides + (availableWidth - bbox.width * k) / 2 - bbox.x * k;
  const ty = paddingTop + (availableHeight - bbox.height * k) / 2 - bbox.y * k;

  const target = d3.zoomIdentity.translate(tx, ty).scale(k);
  const sel = animate ? svg.transition("fit").duration(duration) : svg;
  sel.call(zoom.transform, target);
}

function highlightPath(d) {
  const ancestors = d.ancestors();
  const ancestorIds = ancestors.map((a) => a.id);

  g.selectAll("path.link")
    .style("stroke", (link) =>
      ancestorIds.includes(link.target.id)
        ? "var(--accent)"
        : "var(--accent-2)",
    )
    .style("stroke-width", (link) =>
      ancestorIds.includes(link.target.id) ? "3px" : "1.5px",
    )
    .style("opacity", (link) =>
      ancestorIds.includes(link.target.id) ? 1 : 0.2,
    );

  g.selectAll("g.node").style("opacity", (node) =>
    ancestorIds.includes(node.id) ? 1 : 0.3,
  );
}

function resetHighlight() {
  g.selectAll("path.link")
    .style("stroke", "var(--accent-2)")
    .style("stroke-width", "1.5px")
    .style("opacity", 0.6);
  g.selectAll("g.node").style("opacity", 1);
}

function update(source) {
  const nodes = tree(root).descendants().reverse();
  const links = tree(root).links();

  // Nodes
  const node = g.selectAll("g.node").data(nodes, (d) => d.id || (d.id = ++i));

  const nodeEnter = node
    .enter()
    .append("g")
    .attr("class", "node")
    .attr("transform", (d) => `translate(${source.y0},${source.x0})`)
    .on("click", (event, d) => {
      manualMode = false;
      selectNode(d);
      if (focusMode && d._children) {
        collapseExceptPath(root, d);
      }
      toggle(d);
      update(d);
    })
    .on("contextmenu", (event, d) => showContextMenu(event, d));

  nodeEnter
    .append("circle")
    .attr("r", 1e-6)
    .style("fill", (d) => (d._children ? "var(--bg)" : "var(--accent)"));

  nodeEnter
    .append("a")
    .attr("target", "_blank")
    .attr("href", (d) => d.data.url || null)
    .append("text")
    .attr("x", (d) => (d.children || d._children ? -10 : 10))
    .attr("dy", ".35em")
    .attr("text-anchor", (d) => (d.children || d._children ? "end" : "start"))
    .text((d) => d.data.name)
    .style("fill-opacity", 1e-6);

  // Tooltip logic
  nodeEnter
    .on("mouseover", (event, d) => {
      highlightPath(d);
      if (d.data.description) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.classed("glass-tooltip", true);
        tooltip
          .html(d.data.description)
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY - 28 + "px");
      }
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY - 28 + "px");
    })
    .on("mouseout", () => {
      resetHighlight();
      tooltip.transition().duration(500).style("opacity", 0);
    });

  const t = svg
    .transition()
    .duration(duration)
    .ease(d3.easeElasticOut.amplitude(1).period(0.5));

  const nodeUpdate = node
    .merge(nodeEnter)
    .classed("is-selected", (d) => selectedNode && d.id === selectedNode.id)
    .classed("node--on-path", (d) => !!d.children);

  nodeUpdate.transition(t).attr("transform", (d) => `translate(${d.y},${d.x})`);

  nodeUpdate
    .select("circle")
    .attr("r", 6)
    .style("fill", (d) => (d._children ? "var(--bg)" : "var(--accent)"));

  nodeUpdate.select("text").style("fill-opacity", 1);

  const nodeExit = node
    .exit()
    .transition(t)
    .attr("transform", (d) => `translate(${source.y},${source.x})`)
    .remove();

  nodeExit.select("circle").attr("r", 1e-6);
  nodeExit.select("text").style("fill-opacity", 1e-6);

  // Links
  const link = g.selectAll("path.link").data(links, (d) => d.target.id);

  const linkEnter = link
    .enter()
    .insert("path", "g")
    .attr("class", "link")
    .attr("d", (d) => {
      const o = { x: source.x0, y: source.y0 };
      return d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)({ source: o, target: o });
    });

  link
    .merge(linkEnter)
    .transition(t)
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x),
    );

  link
    .exit()
    .transition(t)
    .attr("d", (d) => {
      const o = { x: source.x, y: source.y };
      return d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x)({ source: o, target: o });
    })
    .remove();

  nodes.forEach((d) => {
    d.x0 = d.x;
    d.y0 = d.y;
  });

  if (!manualMode) {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => fitToView(true), duration);
  }
}
