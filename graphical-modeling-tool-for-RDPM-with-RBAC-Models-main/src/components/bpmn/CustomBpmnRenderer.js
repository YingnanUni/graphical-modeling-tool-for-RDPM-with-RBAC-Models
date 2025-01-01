/**
 * 	1.	自定义 BPMN 任务节点的渲染
	•	使用 CustomBpmnRenderer 类扩展了默认的 BPMN.js 渲染器，以支持任务节点的自定义样式和内容，比如任务名称、角色、资源信息，以及状态指示器等。
	2.	动态任务模式和资源分配
	•	提供 ChangePatternModal 模态框组件，让用户通过一个界面定义任务的基本信息（如名称、角色、资源）并插入到 BPMN 图中。
	•	支持任务的多种插入模式（例如插入到当前任务之前、之后、并行等）。
	3.	任务与资源的交互性增强
	•	支持双击任务节点弹出资源分配界面。
	•	通过自定义事件（如 bpmnTaskInsert 和 openResourceAllocation），实现任务插入、更新和删除等动态交互操作。
	4.	与 Redux 状态管理集成
	•	使用 useSelector 从 Redux 状态中读取角色（roles）和资源（resources），以便动态生成选择列表，增强与全局状态的联动。
	5.	用户体验改进
	•	增强的任务节点可视化：使用不同颜色和文本表示任务状态、角色和资源信息。
	•	增加任务的鼠标交互（如悬停、点击）和工具提示功能，提升可用性。
 */
import BaseRenderer from "diagram-js/lib/draw/BaseRenderer";
import { append as svgAppend, create as svgCreate } from "tiny-svg";
import React, { useState } from "react";
import { Modal, Form, Input, Select, Radio, message } from "antd";
import { useSelector } from "react-redux";
import { selectRoles } from "../../store/roleSlice";
import { selectResources } from "../../store/resourceSlice";

// Constants for rendering configuration
const HIGH_PRIORITY = 1500;
const TASK_WIDTH = 100;
const TASK_HEIGHT = 80;

//一个弹出的模态框组件，用于让用户定义新的任务信息。
export const ChangePatternModal = ({
  visible,
  onCancel,
  onConfirm,
  patternType,
  currentTask,
}) => {
  const [form] = Form.useForm();
  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);
  const [allocationType, setAllocationType] = useState("1:1");

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const newTaskData = {
        ...values,
        allocationType,
        isShared: false,
        maxShares: 1,
      };

      onConfirm(newTaskData, patternType, currentTask?.id);

      document.dispatchEvent(
        new CustomEvent("bpmnTaskInsert", {
          detail: {
            newTask: newTaskData,
            patternType,
            currentTaskId: currentTask?.id,
          },
        })
      );

      form.resetFields();
    } catch (error) {
      message.error("Please complete all required fields");
    }
  };

  return (
    <Modal
      title={`Add ${
        patternType === "before"
          ? "Previous"
          : patternType === "after"
          ? "Next"
          : "Parallel"
      } Task`}
      open={visible}
      onCancel={onCancel}
      onOk={handleSubmit}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          allocationType: "1:1",
        }}
      >
        <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        <Form.Item name="allocationType" label="Allocation Type">
          <Radio.Group
            value={allocationType}
            onChange={(e) => setAllocationType(e.target.value)}
          >
            <Radio.Button value="1:1">1:1</Radio.Button>
            <Radio.Button value="1:n">1:n</Radio.Button>
            <Radio.Button value="n:n">n:n</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
          <Select mode={allocationType === "n:n" ? "multiple" : undefined}>
            {roles.map((role) => (
              <Select.Option key={role.id} value={role.id}>
                {role.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="resourceId"
          label="Resource"
          rules={[{ required: true }]}
        >
          <Select
            mode={
              ["1:n", "n:n"].includes(allocationType) ? "multiple" : undefined
            }
          >
            {resources.map((resource) => (
              <Select.Option
                key={resource.id}
                value={resource.id}
                disabled={!resource.isShared && resource.status === "occupied"}
              >
                {resource.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

// 扩展 BPMN.js 的 BaseRenderer 类，实现任务节点的自定义渲染逻辑。
export class CustomBpmnRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer, elementRegistry) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;

    // 初始化服务引用
    this.modeling = null;
    this.bpmnFactory = null;
    this.modeler = null;

    // 获取注入器
    const injector = eventBus._injector;

    if (injector) {
      try {
        // 直接尝试获取服务
        this.modeling = injector.get("modeling");
        this.bpmnFactory = injector.get("bpmnFactory");
        this.modeler = injector.get("modeler");
      } catch (e) {
        console.warn("Initial service injection failed, will try later:", e);
      }
    }

    // 修改初始化方法
    this.initializeServices = () => {
      return new Promise((resolve) => {
        if (this.modeling && this.bpmnFactory) {
          resolve(true);
          return;
        }

        const tryGetServices = () => {
          const canvas = this.elementRegistry.get("__canvas");
          if (!canvas) return false;

          try {
            const injector = canvas._injector || this.eventBus._injector;
            if (!injector) return false;

            this.modeling = injector.get("modeling");
            this.bpmnFactory = injector.get("bpmnFactory");
            this.modeler = injector.get("modeler");

            return !!(this.modeling && this.bpmnFactory);
          } catch (e) {
            return false;
          }
        };

        let attempts = 0;
        const maxAttempts = 10;

        const checkServices = () => {
          if (tryGetServices()) {
            resolve(true);
            return;
          }

          attempts++;
          if (attempts >= maxAttempts) {
            console.error("Failed to initialize BPMN services");
            resolve(false);
            return;
          }

          setTimeout(checkServices, 500);
        };

        checkServices();
      });
    };

    // 监听关键事件
    const initEvents = ["diagram.init", "import.done", "canvas.init"];
    initEvents.forEach((event) => {
      eventBus.on(event, () => {
        this.initializeServices().catch(console.error);
      });
    });

    // 修改任务插入事件监听器
    document.addEventListener("bpmnTaskInsert", async (event) => {
      try {
        await this.ensureServices();

        const { newTask, patternType, currentTaskId } = event.detail;
        const currentElement = this.elementRegistry.get(currentTaskId);

        if (!currentElement) {
          message.error("Current task element not found");
          return;
        }

        let result;
        switch (patternType) {
          case "before":
          case "Insert Before":
            result = await this.createBeforeTask(currentElement, newTask);
            break;
          case "after":
          case "Insert After":
            result = await this.createAfterTask(currentElement, newTask);
            break;
          case "parallel":
          case "Insert Parallel":
            result = await this.createParallelTask(currentElement, newTask);
            break;
          default:
            throw new Error(`Unsupported pattern type: ${patternType}`);
        }

        if (result) {
          this.modeling.updateProperties(currentElement, {
            name: currentElement.businessObject.name,
            taskData: newTask,
          });
          message.success("Task inserted successfully");
        }
      } catch (error) {
        console.error("Error handling task insertion:", error);
        message.error("Failed to insert task. Please try again.");
      }
    });

    // 注册双击事件 Resource Allocation
    eventBus.on("element.dblclick", (event) => {
      const { element } = event;
      if (element.type === "bpmn:Task") {
        const taskData = element.businessObject || {};

        // 触发资源分配事件
        document.dispatchEvent(
          new CustomEvent("openResourceAllocation", {
            detail: {
              taskId: element.id,
              taskData: {
                ...taskData,
                // 确保包含所有必要的任务数据
                name: taskData.name,
                roleId: taskData.roleId,
                resourceId: taskData.resourceId,
                allocationType: taskData.allocationType,
                roleResources: taskData.roleResources,
                isShared: taskData.isShared,
              },
            },
          })
        );
      }
    });
  }

  // 修改服务检查方法
  async ensureServices() {
    if (this.modeling && this.bpmnFactory) {
      return true;
    }

    const initialized = await this.initializeServices();
    if (!initialized) {
      throw new Error("无法初始化BPMN服务");
    }
    return true;
  }

  /**
   * 在当前任务之前创建新任务
   * @param {Object} currentElement - 当前任务元素
   * @param {Object} newTaskData - 新任务的数据
   */
  async createBeforeTask(currentElement, newTaskData) {
    await this.ensureServices();

    try {
      if (!this.modeling || !this.bpmnFactory) {
        throw new Error("BPMN服务未就绪");
      }

      // 创建新任务的业务对象
      const taskBo = this.bpmnFactory.create("bpmn:Task", {
        name: newTaskData.name || "New Task",
        taskData: newTaskData,
      });

      // 计算新任务位置
      const position = {
        x: currentElement.x - TASK_WIDTH - 100,
        y: currentElement.y,
      };

      // 创建新任务
      const newElement = this.modeling.createShape(
        { type: "bpmn:Task", businessObject: taskBo },
        position,
        currentElement.parent
      );

      // 处理连接
      if (currentElement.incoming && currentElement.incoming.length > 0) {
        const incomingConnection = currentElement.incoming[0];
        const sourceElement = incomingConnection.source;

        this.modeling.removeConnection(incomingConnection);
        this.modeling.connect(sourceElement, newElement);
        this.modeling.connect(newElement, currentElement);
      } else {
        this.modeling.connect(newElement, currentElement);
      }

      return newElement;
    } catch (error) {
      console.error("Error in createBeforeTask:", error);
      throw error;
    }
  }

  /**
   * 在当前任务之后创建新任务
   * @param {Object} currentElement - 当前任务元素
   * @param {Object} newTaskData - 新任务的数据
   */
  createAfterTask(currentElement, newTaskData) {
    try {
      const modeling = this.modelerRef.get("modeling");
      const elementFactory = this.modelerRef.get("elementFactory");
      const bpmnFactory = this.modelerRef.get("bpmnFactory");

      // 创建新任务的业务对象
      const taskBo = bpmnFactory.create("bpmn:Task", {
        name: newTaskData.name || "New Task",
        isExecutable: true,
        ...newTaskData,
      });

      // 创建新任务的形状
      const newTaskShape = elementFactory.createShape({
        type: "bpmn:Task",
        businessObject: taskBo,
        width: TASK_WIDTH,
        height: TASK_HEIGHT,
      });

      // 计算新任务的位置（在当前任务右侧）
      const position = {
        x: currentElement.x + currentElement.width + 100,
        y: currentElement.y,
      };

      // 在图表中创建新任务
      const newElement = modeling.createShape(
        newTaskShape,
        position,
        currentElement.parent
      );

      // 处理连接关系
      if (currentElement.outgoing && currentElement.outgoing.length > 0) {
        // 获取当前任务的后续连接
        const outgoingConnection = currentElement.outgoing[0];
        const targetElement = outgoingConnection.target;

        // 删除原有连接
        modeling.removeConnection(outgoingConnection);

        // 创建新的连接关系
        modeling.connect(currentElement, newElement);
        modeling.connect(newElement, targetElement);
      } else {
        // 如果没有后续连接，直接连接当前任务到新任务
        modeling.connect(currentElement, newElement);
      }

      return newElement;
    } catch (error) {
      console.error("Error creating after task:", error);
      throw error;
    }
  }

  /**
   * 创建与当前任务并行的新任务
   * @param {Object} currentElement - 当前任务元素
   * @param {Object} newTaskData - 新任务的数据
   */
  createParallelTask(currentElement, newTaskData) {
    try {
      const modeling = this.modelerRef.get("modeling");
      const elementFactory = this.modelerRef.get("elementFactory");
      const bpmnFactory = this.modelerRef.get("bpmnFactory");

      // 创建并行网关
      const createGateway = (type, position) => {
        const gatewayBo = bpmnFactory.create("bpmn:ParallelGateway");
        const gatewayShape = elementFactory.createShape({
          type: "bpmn:ParallelGateway",
          businessObject: gatewayBo,
        });
        return modeling.createShape(
          gatewayShape,
          position,
          currentElement.parent
        );
      };

      // 创建分支网关（在当前任务前）
      const splitGateway = createGateway("split", {
        x: currentElement.x - 50,
        y: currentElement.y,
      });

      // 创建合并网关（在当前任务后）
      const joinGateway = createGateway("join", {
        x: currentElement.x + currentElement.width + 50,
        y: currentElement.y,
      });

      // 创建新的并行任务
      const taskBo = bpmnFactory.create("bpmn:Task", {
        name: newTaskData.name || "Parallel Task",
        isExecutable: true,
        ...newTaskData,
      });

      const newTaskShape = elementFactory.createShape({
        type: "bpmn:Task",
        businessObject: taskBo,
        width: TASK_WIDTH,
        height: TASK_HEIGHT,
      });

      // 在当前任务下方创建并行任务
      const newElement = modeling.createShape(
        newTaskShape,
        {
          x: currentElement.x,
          y: currentElement.y + 100,
        },
        currentElement.parent
      );

      // 重新立连接关系
      if (currentElement.incoming && currentElement.incoming.length > 0) {
        const incomingConnection = currentElement.incoming[0];
        const sourceElement = incomingConnection.source;
        modeling.removeConnection(incomingConnection);
        modeling.connect(sourceElement, splitGateway);
      }

      // 连接分支网关到两个任务
      modeling.connect(splitGateway, currentElement);
      modeling.connect(splitGateway, newElement);

      // 连接两个任务到合并网关
      modeling.connect(currentElement, joinGateway);
      modeling.connect(newElement, joinGateway);

      // 连接合并网关到后续任务
      if (currentElement.outgoing && currentElement.outgoing.length > 0) {
        const outgoingConnection = currentElement.outgoing[0];
        const targetElement = outgoingConnection.target;
        modeling.removeConnection(outgoingConnection);
        modeling.connect(joinGateway, targetElement);
      }

      return newElement;
    } catch (error) {
      console.error("Error creating parallel task:", error);
      throw error;
    }
  }

  /**
   * Determines if this renderer can handle the given element
   * @param {Object} element - The BPMN element to be rendered
   * @returns {boolean} True if the element is a BPMN Task
   */
  canRender(element) {
    return element.type === "bpmn:Task";
  }

  /**
   * Renders a BPMN element with custom styling and additional information
   * @param {SVGElement} parentNode - The parent SVG node to append the shape to
   * @param {Object} element - The BPMN element to be rendered
   * @returns {SVGElement} The rendered shape
   */
  drawShape(parentNode, element) {
    // Get the base shape from the default renderer
    const shape = this.bpmnRenderer.drawShape(parentNode, element);

    if (element.type === "bpmn:Task") {
      const { businessObject } = element;
      const taskData = businessObject || {};

      // Remove default text elements from the base renderer
      const existingTexts = parentNode.querySelectorAll("text");
      existingTexts.forEach((text) => text.remove());

      // Create and configure task name text element
      const taskName = svgCreate("text", {
        x: TASK_WIDTH / 2,
        y: 20,
        class: "task-label",
        style: "text-anchor: middle; font-size: 12px;",
      });
      taskName.textContent = taskData.name || "Unnamed Task";

      // Add role information if available
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

      // Add resource information if available
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

      // Create status indicator circle
      const statusIndicator = svgCreate("circle", {
        cx: TASK_WIDTH - 10,
        cy: 10,
        r: 5,
        class: `status-${taskData.status || "pending"}`,
      });

      // Define status background colors for different states
      const statusColors = {
        pending: "#fafafa",
        running: "#e6f7ff",
        completed: "#f6ffed",
        failed: "#fff1f0",
      };

      // Create task group for grouping related elements
      const taskGroup = svgCreate("g", {
        class: `task-group ${element.businessObject.group || ""}`,
      });

      // Create background rectangle with status color
      const statusBg = svgCreate("rect", {
        x: 0,
        y: 0,
        width: TASK_WIDTH,
        height: TASK_HEIGHT,
        rx: 5,
        ry: 5,
        fill: statusColors[element.businessObject.status || "pending"],
      });

      svgAppend(taskGroup, statusBg);

      // Append visual elements in the correct order
      svgAppend(parentNode, taskName);
      svgAppend(parentNode, statusIndicator);

      // Create tooltip container using foreignObject
      const tooltip = svgCreate("foreignObject", {
        x: 0,
        y: -30,
        width: TASK_WIDTH,
        height: 25,
        class: "task-tooltip",
        style: "display: none",
      });

      // Add hover event listeners for tooltip visibility
      parentNode.addEventListener("mouseenter", () => {
        tooltip.style.display = "block";
      });

      parentNode.addEventListener("mouseleave", () => {
        tooltip.style.display = "none";
      });

      // Create and populate tooltip content
      const tooltipContent = svgCreate("div", {
        innerHTML: `
          <div class="tooltip-content">
            <p>Role: ${taskData.roleName}</p>
            <p>Resource: ${taskData.resourceName}</p>
            <p>Status: ${taskData.status}</p>
          </div>
        `,
      });

      svgAppend(tooltip, tooltipContent);
      svgAppend(parentNode, tooltip);

      // 创建可点击区域
      const clickableGroup = svgCreate("g", {
        class: "task-clickable-area",
        cursor: "pointer",
      });

      // 添加点击事件处理器
      const handleClick = (event) => {
        event.stopPropagation();
        console.log("Task clicked:", element); // 调试日志
        this.elementRegistry.eventBus.fire("element.click", {
          element: element,
          originalEvent: event,
          businessObject: element.businessObject,
        });
      };

      clickableGroup.addEventListener("click", handleClick);

      // 包装原始形状并添加视觉反馈
      while (parentNode.firstChild) {
        clickableGroup.appendChild(parentNode.firstChild);
      }
      svgAppend(parentNode, clickableGroup);

      // 添加鼠标悬停效果
      clickableGroup.addEventListener("mouseenter", () => {
        clickableGroup.style.filter = "brightness(0.95)";
        clickableGroup.style.cursor = "pointer";
      });

      clickableGroup.addEventListener("mouseleave", () => {
        clickableGroup.style.filter = "none";
      });
    }

    return shape;
  }

  /**
   * Updates the visual display of a task element
   * @param {Object} element - The BPMN element to update
   */
  updateTaskDisplay(element) {
    if (!element || element.type !== "bpmn:Task") return;

    const parentNode = element.parent;
    const taskData = element.businessObject;

    // Update task name and status indicator
    const taskLabel = parentNode.querySelector(".task-label");
    if (taskLabel) {
      taskLabel.textContent = taskData.name || "Unnamed Task";
    }

    const statusIndicator = parentNode.querySelector("circle");
    if (statusIndicator) {
      statusIndicator.setAttribute(
        "class",
        `status-${taskData.status || "pending"}`
      );
    }
  }

  // 添加替换任务的方法
  replaceTask(currentElement, newTask) {
    this.ensureServices();
    this.modeling.updateProperties(currentElement, {
      name: newTask.name,
      ...newTask.properties,
    });
  }

  // 添加删除任务的方法
  deleteTask(element) {
    this.ensureServices();
    this.modeling.removeElements([element]);
  }
}

// Dependency injection configuration
CustomBpmnRenderer.$inject = ["eventBus", "bpmnRenderer", "elementRegistry"];
