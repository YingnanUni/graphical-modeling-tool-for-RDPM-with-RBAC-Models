import React, { useEffect, useRef, useCallback } from "react";
import * as d3 from "d3";
import { message } from "antd";

const TaskChainVisualizer = ({ taskProperties, resources }) => {
  const svgRef = useRef(null);

  // Define constants
  const GATEWAY_SIZE = 50;
  const TASK_WIDTH = 100;
  const TASK_HEIGHT = 80;
  const SPACING = 50;

  useEffect(() => {
    if (!taskProperties || Object.keys(taskProperties).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    svg.attr("width", width).attr("height", height);

    // Add arrow marker definition
    svg
      .append("defs")
      .append("marker")
      .attr("id", "arrow")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 8)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#1890ff");

    // Transform task data structure
    const tasks = Object.entries(taskProperties).map(([id, task], index) => ({
      id,
      ...task,
      x: index * (TASK_WIDTH + SPACING) + 30,
      y: height / 2 - TASK_HEIGHT / 2,
      type: task.executionType || "sequential",
    }));

    // Draw gateways
    const gateways = tasks
      .filter(
        (task) =>
          task.executionType === "conditional" ||
          task.executionType === "parallel"
      )
      .map((task) => ({
        id: `gateway_${task.id}`,
        x: task.x + TASK_WIDTH + SPACING / 2,
        y: task.y + TASK_HEIGHT / 2 - GATEWAY_SIZE / 2,
        type: task.executionType,
      }));

    // Draw gateway nodes
    const gatewayNodes = svg
      .selectAll(".gateway")
      .data(gateways)
      .enter()
      .append("g")
      .attr("class", "gateway")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add gateway shapes
    gatewayNodes
      .append("path")
      .attr(
        "d",
        (d) =>
          d.type === "conditional"
            ? "M0,25L25,0L50,25L25,50Z" // Diamond (conditional gateway)
            : "M0,25L25,0L50,25L25,50Z" // Square (parallel gateway)
      )
      .attr("fill", "#fff")
      .attr("stroke", "#1890ff");

    // Draw task nodes
    const taskNodes = svg
      .selectAll(".task")
      .data(tasks)
      .enter()
      .append("g")
      .attr("class", "task")
      .attr("transform", (d) => `translate(${d.x},${d.y})`);

    // Add task rectangles
    taskNodes
      .append("rect")
      .attr("width", TASK_WIDTH)
      .attr("height", TASK_HEIGHT)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", "#fff")
      .attr("stroke", "#1890ff");

    // Add task names
    taskNodes
      .append("text")
      .attr("x", TASK_WIDTH / 2)
      .attr("y", TASK_HEIGHT / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .text((d) => d.name || "Unnamed Task");

    // Add resource status indicators
    taskNodes
      .append("circle")
      .attr("cx", TASK_WIDTH - 10)
      .attr("cy", 10)
      .attr("r", 5)
      .attr("fill", (d) => {
        const resource = resources.find((r) => r.id === d.resourceId);
        return resource?.status === "Occupied" ? "#ff4d4f" : "#52c41a";
      })
      .attr("class", "resource-status");

    // Add resource information tooltip
    taskNodes.append("title").text((d) => {
      const resource = resources.find((r) => r.id === d.resourceId);
      return `Resource: ${resource?.name || "None"}
Status: ${resource?.status || "Unknown"}`;
    });

    // Draw connections between tasks
    tasks.forEach((task) => {
      if (task.nextTaskId) {
        const nextTask = tasks.find((t) => t.id === task.nextTaskId);
        if (nextTask) {
          // Check if a gateway is involved
          const gateway = gateways.find((g) => g.id === `gateway_${task.id}`);

          if (gateway) {
            // Draw line to the gateway
            svg
              .append("path")
              .attr(
                "d",
                `
                M ${task.x + TASK_WIDTH} ${task.y + TASK_HEIGHT / 2}
                L ${gateway.x} ${gateway.y + GATEWAY_SIZE / 2}
              `
              )
              .attr("stroke", "#1890ff")
              .attr("stroke-width", 2)
              .attr("fill", "none")
              .attr("marker-end", "url(#arrow)");

            // Draw line from the gateway to the next task
            svg
              .append("path")
              .attr(
                "d",
                `
                M ${gateway.x + GATEWAY_SIZE} ${gateway.y + GATEWAY_SIZE / 2}
                L ${nextTask.x} ${nextTask.y + TASK_HEIGHT / 2}
              `
              )
              .attr("stroke", "#1890ff")
              .attr("stroke-width", 2)
              .attr("fill", "none")
              .attr("marker-end", "url(#arrow)");
          } else {
            // Directly connect to the next task
            svg
              .append("path")
              .attr(
                "d",
                `
                M ${task.x + TASK_WIDTH} ${task.y + TASK_HEIGHT / 2}
                L ${nextTask.x} ${nextTask.y + TASK_HEIGHT / 2}
              `
              )
              .attr("stroke", "#1890ff")
              .attr("stroke-width", 2)
              .attr("fill", "none")
              .attr("marker-end", "url(#arrow)");
          }
        }
      }
    });
  }, [taskProperties, resources]);

  return <svg ref={svgRef} />;
};

export default TaskChainVisualizer;
