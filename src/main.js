import * as d3 from "d3";
import {
  collapseNode,
  collapseExceptPath,
  initializeRoot,
  toggle,
  expandToNodes,
} from "./utils/tree.js";

let width,
  height,
  i = 0,
  duration = 750,
  root;

let manualMode = false;
let fitTimer = null;
let focusMode = true;
let discoveryComplete = false;

function startDiscovery() {
  const introLayer = document.getElementById("intro-layer");
  const lockIcon = document.getElementById("lock-icon");
  const svgCanvas = document.querySelector("#body svg");
  const controls = document.querySelector(".controls-overlay");

  lockIcon.style.filter = "url(#mist-dissolve)";
  const turb = document.getElementById("mist-turb");
  const disp = document.getElementById("mist-disp");

  let start = null;
  const dissolveDuration = 1500; // 1.5s

  function animateMist(timestamp) {
    if (!start) start = timestamp;
    const progress = (timestamp - start) / dissolveDuration;

    if (progress < 1) {
      turb.setAttribute("baseFrequency", progress * 0.1);
      disp.setAttribute("scale", progress * 100);
      introLayer.style.opacity = 1 - progress;
      requestAnimationFrame(animateMist);
    } else {
      introLayer.style.visibility = "hidden";
      svgCanvas.classList.add("revealed");
      controls.style.display = "flex";
      discoveryComplete = true;
      fitToView(true);
    }
  }
  requestAnimationFrame(animateMist);
}

document.addEventListener("DOMContentLoaded", () => {
  const introLayer = document.getElementById("intro-layer");
  if (introLayer) {
    introLayer.addEventListener("click", startDiscovery);
  }

  document.getElementById("search-input").addEventListener("input", (e) => {
    const term = e.target.value.toLowerCase();
    if (!term) {
      resetHighlight();
      return;
    }

    const nodes = root.descendants();
    const matches = nodes.filter((d) =>
      d.data.name.toLowerCase().includes(term),
    );

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
    .transition(t)
    .attr("transform", (d) => `translate(${d.y},${d.x})`);

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

  g.selectAll("g.node").classed("node--on-path", (d) => !!d.children);

  if (!manualMode && discoveryComplete) {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(() => fitToView(true), duration);
  }
}
