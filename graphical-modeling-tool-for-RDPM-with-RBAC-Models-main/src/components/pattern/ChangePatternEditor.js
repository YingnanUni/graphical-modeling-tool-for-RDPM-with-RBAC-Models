/**
 * ChangePatternEditor 是一个 React 组件，主要用于：
 *
 * 1. BPMN 图表的绘制和编辑：
 *    - 使用 bpmn-js 创建 BPMN 图表。
 *
 * 2. 任务链预览：
 *    - 提供一个实时预览的界面，展示任务链的可视化关系。
 *
 * 3. 任务属性编辑：
 *    - 可选择 BPMN 图中的任务，编辑其属性（如角色、资源、连接关系等）。
 *
 * 4. 角色和资源管理：
 *    - 支持选择和分配角色与资源到任务。
 *
 * 5. 文件导入与导出：
 *    - 支持导入和导出 BPMN 文件（XML 格式）以及 JSON 格式文件。
 */

// React and hooks
import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";

// BPMN libraries and styles
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import { useDispatch, useSelector } from "react-redux";

// Ant Design components
import {
  Button,
  Space,
  Select,
  Card,
  message,
  Form,
  Input,
  Modal,
  Dropdown,
  Tabs,
  Empty,
} from "antd";
import { DownOutlined } from "@ant-design/icons";

// Redux state management
import { addPattern } from "../../store/patternSlice";
import { selectRoles } from "../../store/roleSlice";
import { selectResources } from "../../store/resourceSlice";

// Custom components
import TaskPropertiesPanel from "../task/TaskPropertiesPanel";
import TaskChainVisualizer from "../task/TaskChainVisualizer";
import { CustomBpmnRenderer } from "../bpmn/CustomBpmnRenderer";
import TaskTreeMonitor from "../monitor/TaskTreeMonitor";

// Utilities
import {
  validateTaskOperation,
  validateTaskProperties,
} from "../../utils/taskValidation";

/** ====================== CONSTANTS ====================== **/

// Define constants
const HIGH_PRIORITY = 1500;
const TASK_WIDTH = 100;
const TASK_HEIGHT = 80;

// Default BPMN XML template
const defaultDiagram = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" name="Start" />
    <bpmn:task id="Task_1" name="Initial Task" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

/** ====================== COMPONENT ====================== **/

const ChangePatternEditor = () => {
  /** ====================== STATE MANAGEMENT ====================== **/

  // React state for managing tasks, selection, and UI visibility
  const [taskProperties, setTaskProperties] = useState({});
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [processElement, setProcessElement] = useState(null);
  const [propertiesPanelVisible, setPropertiesPanelVisible] = useState(false);
  const [selectedTaskForMonitor, setSelectedTaskForMonitor] = useState(null);
  const [resourceAllocationVisible, setResourceAllocationVisible] =
    useState(false);
  const [selectedTaskForAllocation, setSelectedTaskForAllocation] =
    useState(null);

  // Redux state for roles and resources
  const dispatch = useDispatch();
  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);

  // Memoized roles and resources to optimize rendering
  const memoizedRoles = useMemo(() => roles || [], [roles]);
  const memoizedResources = useMemo(() => resources || [], [resources]);

  // References to BPMN Modeler and its container
  const modelerRef = useRef(null);
  const containerRef = useRef(null);

  // Add file input reference
  const fileInputRef = useRef(null);

  /** ====================== BPMN INITIALIZATION ====================== **/

  // Initialize BPMN Modeler and import the default diagram
  useEffect(() => {
    if (!containerRef.current) return;

    const modeler = new BpmnModeler({
      container: containerRef.current,
      additionalModules: [
        {
          __init__: ["customRenderer"],
          customRenderer: ["type", CustomBpmnRenderer],
        },
      ],
      moddleExtensions: {
        camunda: {
          name: "Camunda",
          uri: "http://camunda.org/schema/1.0/bpmn",
          prefix: "camunda",
        },
      },
      grid: {
        visible: false,
      },
      moveCanvas: {
        enabled: true,
      },
      move: {
        enabled: true,
      },
    });

    // 等待 modeler 完全初始化
    modeler.on("import.done", () => {
      modelerRef.current = modeler;
      // 从 modeler 获取 eventBus
      const eventBus = modeler.get("eventBus");
      // 触发初始化完成事件
      eventBus.fire("modeler.ready");
    });

    // Load default diagram and fit to viewport
    modeler
      .importXML(defaultDiagram)
      .then(() => {
        const canvas = modeler.get("canvas");
        const elementRegistry = modeler.get("elementRegistry");

        const processElement = elementRegistry.find(
          (element) => element.type === "bpmn:Process"
        );

        setProcessElement(processElement);
        canvas.zoom("fit-viewport");
      })
      .catch((err) => {
        console.error("Error loading diagram:", err);
      });

    // Clean up the modeler on unmount
    return () => {
      modeler.destroy();
    };
  }, []);

  /** ====================== TASK OPERATIONS ====================== **/

  // Add, update, or delete tasks
  const handleTaskOperation = useCallback((operation, taskData) => {
    const newProperties = { ...taskData };
    setTaskProperties((prev) => {
      const updated = { ...prev };
      switch (operation) {
        case "add":
          return {
            ...prev,
            [taskData.id]: newProperties,
          };
        case "update":
          return {
            ...prev,
            [taskData.id]: {
              ...prev[taskData.id],
              ...newProperties,
            },
          };
        case "delete":
          delete updated[taskData.id];
          break;
        default:
          console.warn(`Unknown operation: ${operation}`);
          break;
      }
      return updated;
    });
  }, []);

  // Update task connections within the diagram
  const updateTaskConnection = useCallback(
    (sourceId, targetId) => {
      if (!modelerRef.current) return;

      const modeling = modelerRef.current.get("modeling");
      const elementRegistry = modelerRef.current.get("elementRegistry");

      try {
        // Get source and target elements
        const sourceElement = elementRegistry.get(sourceId);
        const targetElement = elementRegistry.get(targetId);

        if (!sourceElement || !targetElement) return;

        // Remove existing connections from source
        const connections = sourceElement.outgoing || [];
        connections.forEach((connection) => {
          modeling.removeConnection(connection);
        });

        // Create new connection if target is specified
        if (targetId) {
          modeling.connect(sourceElement, targetElement, {
            type: "bpmn:SequenceFlow",
          });
        }

        // Update task properties
        handleTaskOperation("update", {
          id: sourceId,
          nextTaskId: targetId || null,
        });
      } catch (error) {
        console.error("Error updating task connection:", error);
        message.error("Failed to update task connection");
      }
    },
    [modelerRef, handleTaskOperation]
  );

  /**
   * Task manipulation functions
   * Add task, delete task, update task, etc.
   */
  const handleAddTask = useCallback(
    (element) => {
      if (!modelerRef.current) return;

      const modeling = modelerRef.current.get("modeling");
      const elementFactory = modelerRef.current.get("elementFactory");
      const canvas = modelerRef.current.get("canvas");
      const bpmnFactory = modelerRef.current.get("bpmnFactory");

      try {
        const rootElement = canvas.getRootElement();

        const position = {
          x: element?.x || 300,
          y: element?.y || 200,
        };

        const businessObject = bpmnFactory.create("bpmn:Task", {
          name: `Task ${Object.keys(taskProperties).length + 1}`,
          isExecutable: true,
        });

        const taskShape = elementFactory.createShape({
          type: "bpmn:Task",
          businessObject: businessObject,
          width: TASK_WIDTH,
          height: TASK_HEIGHT,
        });

        const createdElement = modeling.createShape(
          taskShape,
          position,
          rootElement
        );

        handleTaskOperation("add", {
          id: createdElement.id,
          name: businessObject.name,
          position,
          type: "bpmn:Task",
        });

        const selection = modelerRef.current.get("selection");
        selection.select(createdElement);
      } catch (error) {
        console.error("Error creating task:", error);
        message.error("Failed to create new task");
      }
    },
    [modelerRef, taskProperties, handleTaskOperation]
  );

  const handleDeleteTask = useCallback(
    (element) => {
      if (!modelerRef.current || !element?.id) return;

      try {
        const modeling = modelerRef.current.get("modeling");
        const elementRegistry = modelerRef.current.get("elementRegistry");

        const connections = [
          ...(element.incoming || []),
          ...(element.outgoing || []),
        ];

        connections.forEach((connection) => {
          if (connection && elementRegistry.get(connection.id)) {
            modeling.removeConnection(connection);
          }
        });

        modeling.removeShape(element);

        handleTaskOperation("delete", { id: element.id });

        setSelectedElement(null);
        message.success("Task deleted successfully");
      } catch (error) {
        console.error("Error deleting task:", error);
        message.error("Failed to delete task");
      }
    },
    [modelerRef, handleTaskOperation]
  );

  /** ====================== EVENT HANDLERS ====================== **/

  const handleSelection = useCallback(
    (event) => {
      if (!event) {
        setSelectedElement(null);
        setSelectedTaskForMonitor(null);
        return;
      }

      let element = null;
      if (Array.isArray(event.newSelection) && event.newSelection.length > 0) {
        element = event.newSelection[0];
      } else if (event.element) {
        element = event.element;
      }

      if (element?.type === "bpmn:Task") {
        setTimeout(() => {
          setSelectedElement(element);
          setSelectedTaskForMonitor(element);
          handleTaskOperation("update", {
            id: element.id,
            name: element.businessObject?.name || `Task ${element.id}`,
          });
        }, 0);
      }
    },
    [handleTaskOperation]
  );

  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");

    const handleEvents = {
      selection: (event) => {
        const { element } = event;
        if (element?.type === "bpmn:Task") {
          setTimeout(() => {
            setSelectedElement(element);
            handleTaskOperation("update", {
              id: element.id,
              name: element.businessObject?.name,
            });
          }, 0);
        } else {
          setTimeout(() => {
            setSelectedElement(null);
          }, 0);
        }
      },
    };

    eventBus.on("selection.changed", handleEvents.selection);

    return () => {
      eventBus.off("selection.changed", handleEvents.selection);
    };
  }, [modelerRef, handleTaskOperation]);

  const handlePropertyChange = useCallback(
    (taskId, properties) => {
      if (!modelerRef.current || !taskId) return;

      try {
        // 验证任务属性
        const validationResult = validateTaskProperties(
          properties,
          taskProperties
        );
        if (!validationResult.isValid) {
          message.error(validationResult.message);
          return;
        }

        // 获取 BPMN 建模服务
        const modeling = modelerRef.current.get("modeling");
        const elementRegistry = modelerRef.current.get("elementRegistry");
        const element = elementRegistry.get(taskId);

        if (element) {
          // 更新 BPMN 节点属性
          modeling.updateProperties(element, {
            name: properties.name,
            roleId: properties.roleId,
            resourceId: properties.resourceId,
            allocationType: properties.allocationType,
            isShared: properties.isShared,
            maxShares: properties.maxShares,
            nextTaskId: properties.nextTaskId,
            roleResources: properties.roleResources,
          });

          // 如果有连接关系变更，更新连接
          if (properties.nextTaskId !== undefined) {
            updateTaskConnection(taskId, properties.nextTaskId);
          }

          // 更新任务属性状态
          handleTaskOperation("update", {
            id: taskId,
            ...properties,
          });

          // 触发资源分配更新事件
          document.dispatchEvent(
            new CustomEvent("resourceAllocationUpdate", {
              detail: {
                taskId,
                allocation: properties,
              },
            })
          );

          message.success("Task properties updated successfully");
        }
      } catch (error) {
        console.error("Error updating task properties:", error);
        message.error("Failed to update task properties");
      }
    },
    [modelerRef, handleTaskOperation, taskProperties, updateTaskConnection]
  );

  const handleRoleChange = useCallback((value) => {
    setSelectedRole(value);
  }, []);

  const handleResourceChange = useCallback((value) => {
    setSelectedResource(value);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedRole || !selectedResource) {
      message.error("Please select role and resource");
      return;
    }

    const pattern = {
      id: Date.now().toString(),
      tasks: taskProperties,
      roleId: selectedRole,
      resourceId: selectedResource,
    };

    try {
      dispatch(addPattern(pattern));

      Modal.success({
        title: "Success",
        content: "Pattern saved successfully",
      });
    } catch (error) {
      console.error("Error saving pattern:", error);
      message.error("Failed to save pattern");
    }
  }, [taskProperties, selectedRole, selectedResource, dispatch]);

  /** ====================== EXPORT/IMPORT ====================== **/

  // Export BPMN XML file
  const handleExportBPMN = async () => {
    try {
      if (!modelerRef.current) {
        message.error("BPMN modeler not initialized");
        return;
      }

      const { xml } = await modelerRef.current.saveXML({ format: true });

      // Create download link
      const element = document.createElement("a");
      const file = new Blob([xml], { type: "application/xml" });
      element.href = URL.createObjectURL(file);
      element.download = `pattern_${Date.now()}.bpmn`;

      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      message.success("BPMN file exported successfully");
    } catch (error) {
      console.error("Error exporting BPMN:", error);
      message.error("Failed to export BPMN file");
    }
  };

  // Export JSON file
  const handleExportJSON = () => {
    try {
      const jsonData = {
        tasks: taskProperties,
        roles: selectedRole,
        resources: selectedResource,
        exportedAt: new Date().toISOString(),
      };

      const element = document.createElement("a");
      const file = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: "application/json",
      });
      element.href = URL.createObjectURL(file);
      element.download = `pattern_${Date.now()}.json`;

      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      message.success("JSON file exported successfully");
    } catch (error) {
      console.error("Error exporting JSON:", error);
      message.error("Failed to export JSON file");
    }
  };

  // Handle file import
  const handleImport = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();

      reader.onload = async (e) => {
        const content = e.target.result;

        if (file.name.endsWith(".bpmn") || file.name.endsWith(".xml")) {
          // Import BPMN XML
          await modelerRef.current.importXML(content);

          // Update task properties
          const elementRegistry = modelerRef.current.get("elementRegistry");
          const tasks = {};

          elementRegistry.forEach((element) => {
            if (element.type === "bpmn:Task") {
              tasks[element.id] = {
                id: element.id,
                name: element.businessObject.name || "",
                type: element.type,
                roleId: element.businessObject.roleId,
                resourceId: element.businessObject.resourceId,
              };
            }
          });

          setTaskProperties(tasks);
          message.success("BPMN file imported successfully");
        } else if (file.name.endsWith(".json")) {
          // Import JSON
          const jsonData = JSON.parse(content);
          setTaskProperties(jsonData.tasks || {});
          setSelectedRole(jsonData.roles);
          setSelectedResource(jsonData.resources);
          message.success("JSON file imported successfully");
        } else {
          message.error("Unsupported file format");
        }
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Import failed:", error);
      message.error("Failed to import file");
    }

    // Clear file input value, allow repeated import of same file
    event.target.value = "";
  };

  /**
   * Handle inserting a new task before or after an existing task
   * @param {Object} element - The reference task element
   * @param {string} position - Position to insert ("before" or "after")
   */
  const handleInsertTask = useCallback(
    (element, position) => {
      if (!modelerRef.current || !processElement) {
        console.warn("Modeler or process element not initialized");
        return;
      }

      const modeling = modelerRef.current.get("modeling");
      const elementFactory = modelerRef.current.get("elementFactory");
      const bpmnFactory = modelerRef.current.get("bpmnFactory");

      try {
        // Create new task business object
        const taskBo = bpmnFactory.create("bpmn:Task", {
          name: "New Task",
          isExpanded: true,
        });

        // Set parent for the new task
        if (processElement.businessObject) {
          taskBo.$parent = processElement.businessObject;
        } else {
          taskBo.$parent = processElement;
        }

        // Create shape for the new task
        const newTask = elementFactory.createShape({
          type: "bpmn:Task",
          businessObject: taskBo,
          isExpanded: true,
        });

        // Calculate position for the new task
        const position = {
          x:
            position === "before"
              ? element.x - 150 // Place before the reference task
              : element.x + element.width + 50, // Place after the reference task
          y: element.y,
        };

        // Create the new task element in the diagram
        const newElement = modeling.createShape(
          newTask,
          position,
          processElement
        );

        // Handle connections based on insertion position
        if (position === "before") {
          // Reconnect incoming connections to the new task
          const incomingConnections = element.incoming || [];
          incomingConnections.forEach((connection) => {
            modeling.reconnectEnd(connection, newElement);
          });
          // Connect new task to the reference task
          modeling.connect(newElement, element);
        } else {
          // Reconnect outgoing connections from the reference task to the new task
          const outgoingConnections = element.outgoing || [];
          outgoingConnections.forEach((connection) => {
            modeling.reconnectStart(connection, newElement);
          });
          // Connect reference task to the new task
          modeling.connect(element, newElement);
        }

        // Add the new task to task properties
        handleTaskOperation("add", { id: newElement.id });
      } catch (error) {
        console.error("Error inserting task:", error);
        message.error("Failed to insert new task");
      }
    },
    [modelerRef, processElement, handleTaskOperation]
  );

  // Add event listener for element movement in useEffect hook
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");

    // Handle element movement events with null checks
    const handleElementMove = (event) => {
      // Check if event and its properties exist
      if (!event || !event.element || !event.newBounds) {
        console.warn("Invalid element move event:", event);
        return;
      }

      const { element, newBounds } = event;

      // Only update position for task elements with proper validation
      if (
        element.type === "bpmn:Task" &&
        newBounds.x !== undefined &&
        newBounds.y !== undefined
      ) {
        setTaskProperties((prev) => ({
          ...prev,
          [element.id]: {
            ...prev[element.id],
            position: {
              x: newBounds.x,
              y: newBounds.y,
            },
          },
        }));
      }
    };

    // Subscribe to element change events
    eventBus.on("element.changed", handleElementMove);

    // Cleanup event listener on component unmount
    return () => {
      eventBus.off("element.changed", handleElementMove);
    };
  }, [modelerRef]);

  // Disable default BPMN validation rules to allow free movement
  useEffect(() => {
    if (!modelerRef.current) return;

    // Get BPMN rules service
    const bpmnRules = modelerRef.current.get("bpmnRules");

    // Override default movement restrictions
    bpmnRules.canMove = () => true;
    bpmnRules.canResize = () => true;
  }, [modelerRef]);

  // Add position validation utility
  const validatePosition = (position) => {
    return {
      x: position?.x ?? 300, // Default x position if undefined
      y: position?.y ?? 200, // Default y position if undefined
    };
  };

  useEffect(() => {
    if (!modelerRef.current) return;

    // Get required BPMN services
    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");
    const elementRegistry = modelerRef.current.get("elementRegistry");

    // Disable default BPMN validation rules
    const bpmnRules = modelerRef.current.get("rules");

    // Add custom move rule to allow free movement
    eventBus.on("rules.canMove", HIGH_PRIORITY, () => {
      return true;
    });

    // Handle element drag and move events
    eventBus.on(
      ["element.dragstart", "element.move", "element.dragend"],
      (event) => {
        event.context.canExecute = true;
        event.context.canMove = true;
      }
    );

    // Update position after element movement
    eventBus.on("element.changed", (event) => {
      const { element } = event;

      // Check if it's a task and has valid bounds
      if (
        element.type === "bpmn:Task" &&
        element.x !== undefined &&
        element.y !== undefined
      ) {
        handleTaskOperation("update", {
          id: element.id,
          position: {
            x: element.x,
            y: element.y,
          },
        });
      }
    });

    return () => {
      eventBus.off("rules.canMove");
      eventBus.off(["element.dragstart", "element.move", "element.dragend"]);
      eventBus.off("element.changed");
    };
  }, [modelerRef, handleTaskOperation]);

  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");

    const bpmnRules = modelerRef.current.get("bpmnRules");
    bpmnRules.init = () => {
      this.canMove = () => true;
      this.canConnect = () => true;
      this.canResize = () => true;
    };

    // Handle movement events
    eventBus.on(
      ["element.dragstart", "element.move", "element.dragend"],
      HIGH_PRIORITY,
      (event) => {
        const { element } = event;
        if (element.type === "bpmn:Task") {
          event.context.canExecute = true;
          event.context.canMove = true;
        }
      }
    );

    // Update position after movement
    eventBus.on("element.changed", (event) => {
      const { element } = event;
      if (
        element.type === "bpmn:Task" &&
        element.x !== undefined &&
        element.y !== undefined
      ) {
        handleTaskOperation("update", {
          id: element.id,
          position: {
            x: element.x,
            y: element.y,
          },
        });
      }
    });

    return () => {
      eventBus.off(["element.dragstart", "element.move", "element.dragend"]);
      eventBus.off("element.changed");
    };
  }, [modelerRef, handleTaskOperation]);

  // Add this effect to ensure tasks are independently movable
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");

    // Prevent parent movement affecting children
    eventBus.on("element.move.start", HIGH_PRIORITY, (event) => {
      const { shapes } = event.context;
      shapes.forEach((shape) => {
        if (shape.type === "bpmn:Task") {
          // Ensure each task moves independently
          shape.parent = event.context.rootElement;
        }
      });
    });

    // Handle individual task movement
    eventBus.on("element.move", HIGH_PRIORITY, (event) => {
      if (event.element.type === "bpmn:Task") {
        event.context.canExecute = true;
        event.context.canMove = true;
        // Prevent moving with parent
        event.context.moveParent = false;
      }
    });

    return () => {
      eventBus.off("element.move.start");
      eventBus.off("element.move");
    };
  }, [modelerRef]);

  // Add this effect to handle BPMN element interactions
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");

    const handleEvents = {
      selection: (event) => {
        const { element } = event;
        if (element?.type === "bpmn:Task") {
          setSelectedElement(element);
          handleTaskOperation("update", {
            id: element.id,
            name: element.businessObject?.name,
          });
        } else {
          setSelectedElement(null);
        }
      },

      move: (event) => {
        if (!event?.element || !event?.newBounds) return;

        const { element, newBounds } = event;
        if (element.type === "bpmn:Task") {
          handleTaskOperation("update", {
            id: element.id,
            position: {
              x: newBounds.x,
              y: newBounds.y,
            },
          });
        }
      },

      drag: (event) => {
        if (event.element?.type === "bpmn:Task") {
          event.context.canExecute = true;
          event.context.canMove = true;
          event.context.moveParent = false;
        }
      },
    };

    eventBus.on("selection.changed", handleEvents.selection);
    eventBus.on("element.changed", handleEvents.move);
    eventBus.on(
      ["element.dragstart", "element.move", "element.dragend"],
      handleEvents.drag
    );

    return () => {
      eventBus.off("selection.changed", handleEvents.selection);
      eventBus.off("element.changed", handleEvents.move);
      eventBus.off(
        ["element.dragstart", "element.move", "element.dragend"],
        handleEvents.drag
      );
    };
  }, [modelerRef, handleTaskOperation]);

  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const overlays = modelerRef.current.get("overlays");

    const handleElementChange = (event) => {
      if (!event?.element) return;

      try {
        overlays.remove({ element: event.element.id });
      } catch (error) {
        console.warn("Failed to remove overlay:", error);
      }
    };

    eventBus.on("element.changed", handleElementChange);

    return () => {
      eventBus.off("element.changed", handleElementChange);
    };
  }, [modelerRef]);

  useEffect(() => {
    if (!modelerRef.current) return;

    try {
      const eventBus = modelerRef.current.get("eventBus");

      return () => {};
    } catch (error) {
      console.error("Error in event handling:", error);
    }
  }, [handleSelection]);

  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");

    const handleDblClick = (event) => {
      const { element } = event;

      if (element.type === "bpmn:Task") {
        setSelectedElement(element);
        setPropertiesPanelVisible(true);
      }
    };

    // Register double click event listener
    eventBus.on("element.dblclick", handleDblClick);

    return () => {
      eventBus.off("element.dblclick", handleDblClick);
    };
  }, [modelerRef]);

  // Handle task connection updates
  const handleTaskPropertyChange = useCallback(
    (taskId, properties) => {
      if (!modelerRef.current || !taskId) return;

      try {
        // Update task properties
        const validationResult = validateTaskProperties(
          properties,
          taskProperties
        );
        if (!validationResult.isValid) {
          message.error(validationResult.message);
          return;
        }

        // Update BPMN properties
        const modeling = modelerRef.current.get("modeling");
        const elementRegistry = modelerRef.current.get("elementRegistry");
        const element = elementRegistry.get(taskId);

        modeling.updateProperties(element, {
          name: properties.name,
          roleId: properties.roleId,
          resourceId: properties.resourceId,
          nextTaskId: properties.nextTaskId,
        });

        // Update task connection if nextTaskId changed
        updateTaskConnection(taskId, properties.nextTaskId);

        // Update task properties in state
        handleTaskOperation("update", {
          id: taskId,
          ...properties,
        });

        message.success("Task properties updated successfully");
      } catch (error) {
        console.error("Error updating task properties:", error);
        message.error("Failed to update task properties");
      }
    },
    [modelerRef, handleTaskOperation, taskProperties, updateTaskConnection]
  );

  // Add task click event handler
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");

    const handleTaskClick = (event) => {
      const { element } = event;

      if (element.type === "bpmn:Task") {
        // 更新选中的任务
        setSelectedTaskForMonitor(element);

        // 获取任务的资源分配信息
        const taskData = taskProperties[element.id];
        if (taskData) {
          // 触发资源数据加载事件
          document.dispatchEvent(
            new CustomEvent("loadTaskResources", {
              detail: {
                taskId: element.id,
                roleId: taskData.roleId,
                resourceId: taskData.resourceId,
              },
            })
          );
        }

        // 可选：添加视觉反馈
        const modeling = modelerRef.current.get("modeling");
        modeling.setColor(element, {
          stroke: "#1890ff",
        });
      }
    };

    eventBus.on("element.click", handleTaskClick);

    return () => {
      eventBus.off("element.click", handleTaskClick);
    };
  }, [modelerRef, taskProperties]);

  const handleTaskPropertiesChange = (taskId, properties) => {
    setTaskProperties((prev) => ({
      ...prev,
      [taskId]: {
        ...prev[taskId],
        ...properties,
        id: taskId,
      },
    }));
  };

  // 监听资源分配弹窗事件
  useEffect(() => {
    const handleOpenResourceAllocation = (event) => {
      const { taskId, taskData } = event.detail;
      setSelectedTaskForAllocation({ id: taskId, ...taskData });
      setResourceAllocationVisible(true);
    };

    document.addEventListener(
      "openResourceAllocation",
      handleOpenResourceAllocation
    );
    return () => {
      document.removeEventListener(
        "openResourceAllocation",
        handleOpenResourceAllocation
      );
    };
  }, []);

  // Add resource allocation validation
  const validateResourceAllocation = useCallback(
    (taskId, allocation) => {
      const currentTask = taskProperties[taskId];
      if (!currentTask) return false;

      const resource = resources.find((r) => r.id === allocation.resourceId);
      if (!resource) return false;

      // Count current allocations of this resource
      const allocatedCount = Object.values(taskProperties).filter(
        (task) =>
          task.resourceId === allocation.resourceId && task.id !== taskId
      ).length;

      // Check if resource can be allocated
      if (resource.isShared) {
        return allocatedCount < (resource.maxShares || 1);
      }

      // For non-shared resources, check if it's already allocated
      return allocatedCount === 0;
    },
    [taskProperties, resources]
  );

  // Update resource allocation handler
  const handleResourceAllocation = useCallback(
    (taskId, allocation) => {
      // 验证资源分配
      const isValid = validateResourceAllocation(
        allocation.resourceId,
        taskId,
        taskProperties,
        resources
      );

      if (!isValid) {
        message.error("Resource is not available for allocation");
        return;
      }

      // 更新任务属性
      handleTaskOperation("update", {
        id: taskId,
        roleId: allocation.roleId,
        resourceId: allocation.resourceId,
      });

      setResourceAllocationVisible(false);
    },
    [taskProperties, resources, handleTaskOperation]
  );

  useEffect(() => {
    const handleCloseResourceAllocation = () => {
      setResourceAllocationVisible(false);
    };

    document.addEventListener(
      "closeResourceAllocation",
      handleCloseResourceAllocation
    );
    return () => {
      document.removeEventListener(
        "closeResourceAllocation",
        handleCloseResourceAllocation
      );
    };
  }, []);

  // 在 useEffect 中添加事件监听
  useEffect(() => {
    const handleResourceAllocationUpdate = (event) => {
      const { taskId, taskData } = event.detail;

      // 更新任务属性
      handleTaskOperation("update", {
        id: taskId,
        ...taskData,
      });

      // 更新选中的任务监视器
      if (selectedTaskForMonitor && selectedTaskForMonitor.id === taskId) {
        setSelectedTaskForMonitor({
          ...selectedTaskForMonitor,
          businessObject: {
            ...selectedTaskForMonitor.businessObject,
            taskData: taskData,
          },
        });
      }
    };

    // 添加事件监听器
    document.addEventListener(
      "resourceAllocationUpdate",
      handleResourceAllocationUpdate
    );

    // 清理函数
    return () => {
      document.removeEventListener(
        "resourceAllocationUpdate",
        handleResourceAllocationUpdate
      );
    };
  }, [handleTaskOperation, selectedTaskForMonitor]);

  /** ====================== UI RENDERING ====================== **/

  // Add import export buttons
  const ImportExportButtons = () => (
    <Space style={{ marginBottom: 16 }}>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".bpmn,.xml,.json"
        onChange={handleImport}
      />
      <Button onClick={() => fileInputRef.current.click()}>Import File</Button>
      <Dropdown
        menu={{
          items: [
            {
              key: "1",
              label: "Export as BPMN",
              onClick: handleExportBPMN,
            },
            {
              key: "2",
              label: "Export as JSON",
              onClick: handleExportJSON,
            },
          ],
        }}
      >
        <Button>
          Export <DownOutlined />
        </Button>
      </Dropdown>
    </Space>
  );

  return (
    <div className="change-pattern-editor">
      <ImportExportButtons />

      <div
        style={{
          display: "flex",
          gap: "16px",
          height: "calc(100vh - 200px)",
          width: "100%",
        }}
      >
        {/* BPMN Editor */}
        <div style={{ flex: "1 1 60%", minWidth: 0 }}>
          <div
            ref={containerRef}
            className="bpmn-container"
            style={{
              height: "100%",
              border: "1px solid #ddd",
              position: "relative",
            }}
          />
        </div>

        {/* Tree Monitor Side Panel */}
        <div
          style={{
            flex: "0 0 40%",
            minWidth: "300px",
            padding: "16px",
            backgroundColor: "#f5f5f5",
            border: "1px solid #ddd",
            borderRadius: "4px",
          }}
        >
          <TaskTreeMonitor
            task={selectedTaskForMonitor}
            taskProperties={taskProperties}
            resources={resources || []}
            roles={roles || []}
          />
        </div>
      </div>

      {/* 添加资源分配弹窗 */}
      <Modal
        title="Resource Allocation"
        open={resourceAllocationVisible}
        onCancel={() => setResourceAllocationVisible(false)}
        footer={null}
      >
        <TaskPropertiesPanel
          selectedElement={selectedTaskForAllocation}
          taskProperties={taskProperties}
          onTaskPropertiesChange={handleTaskPropertiesChange}
        />
      </Modal>
    </div>
  );
};

export default ChangePatternEditor;
