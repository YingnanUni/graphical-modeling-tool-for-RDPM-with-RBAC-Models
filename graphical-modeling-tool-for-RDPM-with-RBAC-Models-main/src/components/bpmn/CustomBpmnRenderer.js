import BaseRenderer from "diagram-js/lib/draw/BaseRenderer"; // Base class for custom renderers (core of the BPMN.js)
import { append as svgAppend, create as svgCreate } from "tiny-svg"; // SVG utilities
import React, { useState } from "react"; // React for modal components
import { Modal, Form, Input, Select, Radio, message } from "antd"; // Ant Design components
import { useSelector } from "react-redux"; // Redux for state management
import { selectRoles } from "../../store/roleSlice"; // Redux slice for roles
import { selectResources } from "../../store/resourceSlice"; // Redux slice for resources

// Constants for rendering configuration
const HIGH_PRIORITY = 1500;
const TASK_WIDTH = 100;
const TASK_HEIGHT = 80;

/**
 * Modal component to allow users to define new task information.
 * The modal includes fields for task name, allocation type, roles, and resources.
 */
export const ChangePatternModal = ({
  visible,
  onCancel,
  onConfirm,
  patternType, // Type of pattern (before, after, parallel)
  currentTask,
}) => {
  const [form] = Form.useForm();
  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);
  const [allocationType, setAllocationType] = useState("1:1");

  /**
   * Handles form submission and dispatches a custom event to insert the task into the BPMN diagram.
   */
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

      // Dispatch custom event for task insertion
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

/**
 * Custom BPMN renderer extending the BaseRenderer class.
 * This class customizes the appearance and behavior of task nodes in the BPMN diagram.
 */
export class CustomBpmnRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer, elementRegistry) {
    super(eventBus, HIGH_PRIORITY);
    this.bpmnRenderer = bpmnRenderer;
    this.elementRegistry = elementRegistry;
    this.eventBus = eventBus;

    // Initialize modeling and factory services
    this.modeling = null;
    this.bpmnFactory = null;
    this.modeler = null;

    const injector = eventBus._injector;

    if (injector) {
      try {
        // Service for diagram manipulation
        this.modeling = injector.get("modeling");
        // Factory for creating BPMN elements
        this.bpmnFactory = injector.get("bpmnFactory");
        //  Service for the modeler
        this.modeler = injector.get("modeler");
      } catch (e) {
        console.warn("Initial service injection failed, will try later:", e);
      }
    }

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

    const initEvents = ["diagram.init", "import.done", "canvas.init"];
    initEvents.forEach((event) => {
      eventBus.on(event, () => {
        this.initializeServices().catch(console.error);
      });
    });

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

    // Double-click event to open resource allocation
    eventBus.on("element.dblclick", (event) => {
      const { element } = event;
      if (element.type === "bpmn:Task") {
        const taskData = element.businessObject || {};

        document.dispatchEvent(
          new CustomEvent("openResourceAllocation", {
            detail: {
              taskId: element.id,
              taskData: {
                ...taskData,

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

  /** Dynamically create task nodes (pre-tasks, post-tasks, parallel tasks) in the BPMN graph and ensure that the required BPMN services (
   *   e.g. modeling and bpmnFactory) are available through ensureServices.
   */
  async ensureServices() {
    if (this.modeling && this.bpmnFactory) {
      return true;
    }

    const initialized = await this.initializeServices();
    if (!initialized) {
      throw new Error("Unable to initialize BPMN service");
    }
    return true;
  }

  // Dynamically creates a new task node before the current task node and updates its connection relationship.
  async createBeforeTask(currentElement, newTaskData) {
    await this.ensureServices();

    try {
      if (!this.modeling || !this.bpmnFactory) {
        throw new Error("BPMN service not ready");
      }

      const taskBo = this.bpmnFactory.create("bpmn:Task", {
        name: newTaskData.name || "New Task",
        taskData: newTaskData,
      });

      const position = {
        x: currentElement.x - TASK_WIDTH - 100,
        y: currentElement.y,
      };

      const newElement = this.modeling.createShape(
        { type: "bpmn:Task", businessObject: taskBo },
        position,
        currentElement.parent
      );

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

  // Dynamically creates a new task node after the current task node and updates its connection relationship.
  createAfterTask(currentElement, newTaskData) {
    try {
      const modeling = this.modelerRef.get("modeling");
      const elementFactory = this.modelerRef.get("elementFactory");
      const bpmnFactory = this.modelerRef.get("bpmnFactory");

      const taskBo = bpmnFactory.create("bpmn:Task", {
        name: newTaskData.name || "New Task",
        isExecutable: true,
        ...newTaskData,
      });

      const newTaskShape = elementFactory.createShape({
        type: "bpmn:Task",
        businessObject: taskBo,
        width: TASK_WIDTH,
        height: TASK_HEIGHT,
      });

      const position = {
        x: currentElement.x + currentElement.width + 100,
        y: currentElement.y,
      };

      const newElement = modeling.createShape(
        newTaskShape,
        position,
        currentElement.parent
      );

      if (currentElement.outgoing && currentElement.outgoing.length > 0) {
        const outgoingConnection = currentElement.outgoing[0];
        const targetElement = outgoingConnection.target;

        modeling.removeConnection(outgoingConnection);
        modeling.connect(currentElement, newElement);
        modeling.connect(newElement, targetElement);
      } else {
        modeling.connect(currentElement, newElement);
      }

      return newElement;
    } catch (error) {
      console.error("Error creating after task:", error);
      throw error;
    }
  }

  // Create new task nodes parallel to the current task node while connecting parallel tasks through branch gateways and merge gateways.
  createParallelTask(currentElement, newTaskData) {
    try {
      const modeling = this.modelerRef.get("modeling");
      const elementFactory = this.modelerRef.get("elementFactory");
      const bpmnFactory = this.modelerRef.get("bpmnFactory");

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

      const splitGateway = createGateway("split", {
        x: currentElement.x - 50,
        y: currentElement.y,
      });

      const joinGateway = createGateway("join", {
        x: currentElement.x + currentElement.width + 50,
        y: currentElement.y,
      });

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

      const newElement = modeling.createShape(
        newTaskShape,
        {
          x: currentElement.x,
          y: currentElement.y + 100,
        },
        currentElement.parent
      );

      if (currentElement.incoming && currentElement.incoming.length > 0) {
        const incomingConnection = currentElement.incoming[0];
        const sourceElement = incomingConnection.source;
        modeling.removeConnection(incomingConnection);
        modeling.connect(sourceElement, splitGateway);
      }

      modeling.connect(splitGateway, currentElement);
      modeling.connect(splitGateway, newElement);

      modeling.connect(currentElement, joinGateway);
      modeling.connect(newElement, joinGateway);

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

  // =========== Customizing the appearance and interaction of BPMN task nodes =============

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

      const clickableGroup = svgCreate("g", {
        class: "task-clickable-area",
        cursor: "pointer",
      });

      const handleClick = (event) => {
        event.stopPropagation();
        console.log("Task clicked:", element);

        document.dispatchEvent(
          new CustomEvent("taskSelected", {
            detail: {
              task: element,
              taskData: element.businessObject,
            },
          })
        );

        document.dispatchEvent(
          new CustomEvent("resourceAllocationUpdate", {
            detail: {
              taskId: element.id,
              taskData: element.businessObject,
            },
          })
        );

        this.elementRegistry.eventBus.fire("element.click", {
          element: element,
          originalEvent: event,
          businessObject: element.businessObject,
        });
      };

      clickableGroup.addEventListener("click", handleClick);

      while (parentNode.firstChild) {
        clickableGroup.appendChild(parentNode.firstChild);
      }
      svgAppend(parentNode, clickableGroup);

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

  replaceTask(currentElement, newTask) {
    this.ensureServices();
    this.modeling.updateProperties(currentElement, {
      name: newTask.name,
      ...newTask.properties,
    });
  }

  deleteTask(element) {
    this.ensureServices();
    this.modeling.removeElements([element]);
  }
}

CustomBpmnRenderer.$inject = ["eventBus", "bpmnRenderer", "elementRegistry"];
