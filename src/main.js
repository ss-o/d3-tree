import * as d3 from "d3";
import {
  collapseNode,
  collapseExceptPath,
  initializeRoot,
  toggle,
} from "./utils/tree.js";

let width,
  height,
  i = 0,
  duration = 750,
  root;

let manualMode = false;
let fitTimer = null;
let focusMode = true;

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

updateSize();

d3.json("/data.json").then((data) => {
  root = d3.hierarchy(data);
  initializeRoot(root, height);

  if (root.children) {
    root.children.forEach(collapseNode);
  }

  update(root);
});

function fitToView(animate = true) {
  const bbox = g.node().getBBox();
  if (!bbox.width || !bbox.height) return;
  const padding = 40;
  const k = Math.min(
    (width - padding * 2) / bbox.width,
    (height - padding * 2) / bbox.height,
  );
  const tx = width / 2 - (bbox.x + bbox.width / 2) * k;
  const ty = height / 2 - (bbox.y + bbox.height / 2) * k;
  const target = d3.zoomIdentity.translate(tx, ty).scale(k);
  const sel = animate ? svg.transition("fit").duration(400) : svg;
  sel.call(zoom.transform, target);
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
      if (focusMode && d._children) {
        collapseExceptPath(root, d);
      }
      toggle(d);
      update(d);
    });

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
      if (d.data.description) {
        tooltip.transition().duration(200).style("opacity", 0.9);
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
      tooltip.transition().duration(500).style("opacity", 0);
    });

  const nodeUpdate = node
    .merge(nodeEnter)
    .transition()
    .duration(duration)
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

  nodeUpdate
    .select("circle")
    .attr("r", 6)
    .style("fill", (d) => (d._children ? "var(--bg)" : "var(--accent)"));

  nodeUpdate.select("text").style("fill-opacity", 1);

  const nodeExit = node
    .exit()
    .transition()
    .duration(duration)
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
    .transition()
    .duration(duration)
    .attr(
      "d",
      d3
        .linkHorizontal()
        .x((d) => d.y)
        .y((d) => d.x),
    );

  link
    .exit()
    .transition()
    .duration(duration)
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

  g.selectAll("g.node").classed("node--on-path", (d) => !!d.children);

  if (!manualMode) {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => fitToView(true), duration);
  }
}
