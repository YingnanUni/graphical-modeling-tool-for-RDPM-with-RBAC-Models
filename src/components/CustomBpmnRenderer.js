import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import { append as svgAppend, create as svgCreate } from "tiny-svg";

// 添加常量定义
const HIGH_PRIORITY = 1500;
const TASK_WIDTH = 100;
const TASK_HEIGHT = 80;

export default class CustomBpmnRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element) {
    return element.type === "bpmn:Task";
  }

  drawShape(parentNode, element) {
    const shape = this.bpmnRenderer.drawShape(parentNode, element);

    if (element.type === "bpmn:Task") {
      const { businessObject } = element;
      const taskData = businessObject || {};

      // 移除默认的文本元素
      const existingTexts = parentNode.querySelectorAll("text");
      existingTexts.forEach((text) => text.remove());

      // 创建任务名称文本
      const taskName = svgCreate("text", {
        x: TASK_WIDTH / 2,
        y: 20,
        class: "task-label",
        style: "text-anchor: middle; font-size: 12px;",
      });
      taskName.textContent = taskData.name || "Unnamed Task";

      // 添加角色信息
      if (taskData.roleName) {
        const roleText = svgCreate("text", {
          x: TASK_WIDTH / 2,
          y: 40,
          class: "task-info",
          style: "text-anchor: middle; font-size: 10px;",
        });
        roleText.textContent = `Role: ${taskData.roleName}`;
        svgAppend(parentNode, roleText);
      }

      // 添加资源信息
      if (taskData.resourceName) {
        const resourceText = svgCreate("text", {
          x: TASK_WIDTH / 2,
          y: 55,
          class: "task-info",
          style: "text-anchor: middle; font-size: 10px;",
        });
        resourceText.textContent = `Resource: ${taskData.resourceName}`;
        svgAppend(parentNode, resourceText);
      }

      // 添加状态指示器
      const statusIndicator = svgCreate("circle", {
        cx: TASK_WIDTH - 10,
        cy: 10,
        r: 5,
        class: `status-${taskData.status || "pending"}`,
      });

      // 按顺序添加元素
      svgAppend(parentNode, taskName);
      svgAppend(parentNode, statusIndicator);
    }

    return shape;
  }
}

CustomBpmnRenderer.$inject = ["eventBus", "bpmnRenderer"];
