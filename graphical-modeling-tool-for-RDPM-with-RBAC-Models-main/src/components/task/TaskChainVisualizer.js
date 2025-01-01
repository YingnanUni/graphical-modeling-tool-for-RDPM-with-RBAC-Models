import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";

const TaskChainVisualizer = ({ taskProperties, resources }) => {
  const svgRef = useRef(null);

  const updateVisualization = useCallback(
    (taskData) => {
      if (!svgRef.current) return;

      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      const width = 800;
      const height = 400;
      svg.attr("width", width).attr("height", height);

      // Transform task properties into visualization data
      const nodes = Object.entries(taskData).map(([id, task]) => ({
        id,
        ...task,
        resource: resources.find((r) => r.id === task.resourceId),
      }));

      // Create links based on nextTaskId
      const links = nodes
        .filter((node) => node.nextTaskId)
        .map((node) => ({
          source: node.id,
          target: node.nextTaskId,
        }));

      // Create force simulation
      const simulation = d3
        .forceSimulation(nodes)
        .force(
          "link",
          d3
            .forceLink(links)
            .id((d) => d.id)
            .distance(150)
        )
        .force("charge", d3.forceManyBody().strength(-800))
        .force("center", d3.forceCenter(width / 2, height / 2));

      // Draw links
      const link = svg
        .append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#999")
        .attr("stroke-width", 2)
        .attr("marker-end", "url(#arrowhead)");

      // Add arrow marker
      svg
        .append("defs")
        .append("marker")
        .attr("id", "arrowhead")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 8)
        .attr("markerHeight", 8)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#999");

      // Draw nodes
      const node = svg
        .append("g")
        .selectAll("g")
        .data(nodes)
        .join("g")
        .call(
          d3
            .drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended)
        );

      // Add task rectangles
      node
        .append("rect")
        .attr("width", 120)
        .attr("height", 60)
        .attr("rx", 5)
        .attr("fill", (d) => getStatusColor(d.status));

      // Add task names
      node
        .append("text")
        .attr("x", 60)
        .attr("y", 35)
        .attr("text-anchor", "middle")
        .text((d) => d.name || "Unnamed Task");

      // Update positions on simulation tick
      simulation.on("tick", () => {
        link
          .attr("x1", (d) => d.source.x)
          .attr("y1", (d) => d.source.y)
          .attr("x2", (d) => d.target.x)
          .attr("y2", (d) => d.target.y);

        node.attr("transform", (d) => `translate(${d.x - 60},${d.y - 30})`);
      });

      // Drag functions
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    },
    [resources]
  );

  // Listen for BPMN updates
  useEffect(() => {
    const handleBpmnUpdate = (event) => {
      const { allTasks } = event.detail;
      updateVisualization(allTasks);
    };

    document.addEventListener("bpmnTaskUpdate", handleBpmnUpdate);

    return () => {
      document.removeEventListener("bpmnTaskUpdate", handleBpmnUpdate);
    };
  }, [updateVisualization]);

  // Initial render
  useEffect(() => {
    updateVisualization(taskProperties);
  }, [taskProperties, updateVisualization]);

  return (
    <div style={{ border: "1px solid #eee", borderRadius: "4px" }}>
      <svg ref={svgRef} />
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    pending: "#fafafa",
    "in-progress": "#e6f7ff",
    completed: "#f6ffed",
    failed: "#fff1f0",
  };
  return colors[status] || colors.pending;
};

export default TaskChainVisualizer;
