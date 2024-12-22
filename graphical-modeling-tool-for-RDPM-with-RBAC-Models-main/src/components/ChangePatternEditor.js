import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import BpmnModeler from "bpmn-js/lib/Modeler";
import "bpmn-js/dist/assets/diagram-js.css";
import "bpmn-js/dist/assets/bpmn-font/css/bpmn.css";
import { useDispatch, useSelector } from "react-redux";
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
} from "antd";
import { addPattern } from "../store/patternSlice";
import { selectRoles } from "../store/roleSlice";
import { selectResources } from "../store/resourceSlice";
import TaskPropertiesPanel from "./TaskPropertiesPanel";
import { validateTaskChain } from "../utils/patternValidation";
import TaskChainPreview from "./TaskChainPreview";
import TaskChainVisualizer from "./TaskChainVisualizer";
import CustomBpmnRenderer from "./CustomBpmnRenderer";
import * as d3 from "d3";
import {
  validateTaskOperation,
  validateTaskResources,
  validateTaskChainLogic,
  validateTaskProperties,
} from "../utils/taskValidation";
import { DownOutlined } from "@ant-design/icons";

// Define constants
const HIGH_PRIORITY = 1500; // High priority for BPMN event handlers

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

// Add layout constants
const TASK_WIDTH = 100;
const TASK_HEIGHT = 80;
const SPACING = 60;

const ChangePatternEditor = () => {
  // 1. ��态声
  const [form] = Form.useForm();
  const [taskProperties, setTaskProperties] = useState({});
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [rootElement, setRootElement] = useState(null);
  const modelerRef = useRef(null);
  const containerRef = useRef(null);
  const [processElement, setProcessElement] = useState(null);

  const dispatch = useDispatch();
  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);

  // Memoized values
  const memoizedRoles = useMemo(() => roles || [], [roles]);
  const memoizedResources = useMemo(() => resources || [], [resources]);

  // Add state to manage context menu visibility and position
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    items: [],
  });

  // Add state for properties panel visibility
  const [propertiesPanelVisible, setPropertiesPanelVisible] = useState(false);

  // 将这部分代码移到组件开始处，在状态声明之后
  const handleTaskOperation = useCallback(
    (operation, taskData) => {
      // Validate operation
      const validation = validateTaskOperation(
        operation,
        taskData,
        taskProperties
      );
      if (!validation.isValid) {
        message.error(validation.message);
        return;
      }

      // Update task properties
      setTaskProperties((prev) => {
        const newProperties = { ...prev };

        switch (operation) {
          case "add":
            newProperties[taskData.id] = {
              ...taskData,
              status: "pending",
              createdAt: Date.now(),
              name:
                taskData.name ||
                `Task ${Object.keys(newProperties).length + 1}`,
              type: taskData.type || "bpmn:Task",
            };
            break;

          case "update":
            if (newProperties[taskData.id]) {
              newProperties[taskData.id] = {
                ...newProperties[taskData.id],
                ...taskData,
                updatedAt: Date.now(),
              };
            }
            break;

          case "delete":
            // Remove the task and update connections
            delete newProperties[taskData.id];
            Object.values(newProperties).forEach((task) => {
              if (task.nextTaskId === taskData.id) {
                task.nextTaskId = null;
              }
            });

            // Update BPMN diagram
            if (modelerRef.current) {
              const elementRegistry = modelerRef.current.get("elementRegistry");
              const modeling = modelerRef.current.get("modeling");
              const element = elementRegistry.get(taskData.id);
              if (element) {
                modeling.removeElements([element]);
              }
            }
            break;
        }

        // Notify previews of changes
        updatePreviews(operation, taskData, newProperties);
        return newProperties;
      });
    },
    [modelerRef]
  );

  // 替换原有的 handleSelection 函数
  const handleSelection = useCallback(
    (event) => {
      try {
        // 首先检查事件对象是否存在
        if (!event) {
          setSelectedElement(null);
          return;
        }

        // 获取选中的元素
        let selectedElement = null;

        // 处理不同类型的选择事件
        if (
          Array.isArray(event.newSelection) &&
          event.newSelection.length > 0
        ) {
          selectedElement = event.newSelection[0];
        } else if (event.element) {
          selectedElement = event.element;
        } else if (Array.isArray(event.elements) && event.elements.length > 0) {
          selectedElement = event.elements[0];
        }

        // 如果没有选中元素，清除选择状态
        if (!selectedElement) {
          setSelectedElement(null);
          return;
        }

        // 检查业务对象和类型
        const businessObject = selectedElement.businessObject;
        const elementType = businessObject?.$type || selectedElement.type;

        // 检查元素是否为任务类型
        if (elementType === "bpmn:Task") {
          const taskData = {
            id: selectedElement.id,
            name:
              businessObject?.name ||
              `Task ${Object.keys(taskProperties).length + 1}`,
            type: elementType,
          };

          setSelectedElement(selectedElement);
          handleTaskOperation("update", taskData);
        } else {
          setSelectedElement(null);
        }
      } catch (error) {
        console.error("Error in handleSelection:", error);
        console.error("Event:", event);
        console.error("Selected Element:", selectedElement);
        setSelectedElement(null);
      }
    },
    [taskProperties, handleTaskOperation]
  );

  // 3. 任务状态和连管理
  const updateTaskStatus = useCallback(
    (taskId, status) => {
      handleTaskOperation("update", { id: taskId, status });
    },
    [handleTaskOperation]
  );

  const handleTaskConnection = useCallback(
    (sourceTaskId, targetTaskId) => {
      handleTaskOperation("update", {
        id: sourceTaskId,
        nextTaskId: targetTaskId,
      });
    },
    [handleTaskOperation]
  );

  // 4. BPMN 相关操作
  /**
   * Handle adding a new task to the BPMN diagram
   * @param {Object} element - Optional element to position the new task relative to
   */
  const handleAddTask = useCallback(
    (element) => {
      if (!modelerRef.current) return;

      const modeling = modelerRef.current.get("modeling");
      const elementFactory = modelerRef.current.get("elementFactory");
      const canvas = modelerRef.current.get("canvas");
      const bpmnFactory = modelerRef.current.get("bpmnFactory");

      try {
        // 获取根元素
        const rootElement = canvas.getRootElement();

        // 计算新任务位置
        const position = {
          x: element?.x || 300,
          y: element?.y || 200,
        };

        // 创建任务业务对象
        const businessObject = bpmnFactory.create("bpmn:Task", {
          name: `Task ${Object.keys(taskProperties).length + 1}`,
          isExecutable: true,
        });

        // 创建任务形状
        const taskShape = elementFactory.createShape({
          type: "bpmn:Task",
          businessObject: businessObject,
          width: TASK_WIDTH,
          height: TASK_HEIGHT,
        });

        // 添加任务到画布
        const createdElement = modeling.createShape(
          taskShape,
          position,
          rootElement
        );

        // 更新任务属性
        handleTaskOperation("add", {
          id: createdElement.id,
          name: businessObject.name,
          position,
          type: "bpmn:Task", // 确保设置类型
        });

        // 选中新创建的元素
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
        const overlays = modelerRef.current.get("overlays");

        // 首先移除所有与该元素相关的覆盖层
        overlays.remove({ element: element.id });

        // 获取所有连接到此元素的连接线
        const connections = [
          ...(element.incoming || []),
          ...(element.outgoing || []),
        ];

        // 移除连接线
        connections.forEach((connection) => {
          if (connection && elementRegistry.get(connection.id)) {
            modeling.removeConnection(connection);
          }
        });

        // 移除元素
        modeling.removeShape(element);

        // 更新任务属性
        handleTaskOperation("delete", { id: element.id });

        // 清除选中状态
        setSelectedElement(null);
      } catch (error) {
        console.error("Error deleting task:", error);
        message.error("Failed to delete task");
      }
    },
    [modelerRef, handleTaskOperation]
  );

  // 5. 属性变更处
  const handlePropertyChange = useCallback(
    (taskId, changes) => {
      handleTaskOperation("update", {
        id: taskId,
        ...changes,
      });

      if (!modelerRef.current) return;
      const modeling = modelerRef.current.get("modeling");
      const elementRegistry = modelerRef.current.get("elementRegistry");
      const element = elementRegistry.get(taskId);

      if (element && changes.name) {
        modeling.updateProperties(element, {
          name: changes.name,
        });
      }
    },
    [modelerRef, handleTaskOperation]
  );

  // 6. 角色资源选择处理
  const handleRoleChange = useCallback((value) => {
    setSelectedRole(value);
  }, []);

  const handleResourceChange = useCallback((value) => {
    setSelectedResource(value);
  }, []);

  // 7. 保存和导出处理
  const handleSave = useCallback(() => {
    // Get pattern name from form
    const patternName = form.getFieldValue("name");
    if (!patternName) {
      message.error("Please input pattern name");
      return;
    }

    // Validate task chain configuration
    if (!validateTaskChain(taskProperties)) {
      message.error("Invalid task chain configuration");
      return;
    }

    // Create pattern object with metadata
    const pattern = {
      id: Date.now().toString(), // Generate unique ID
      name: patternName,
      tasks: taskProperties,
      roleId: selectedRole,
      resourceId: selectedResource,
      createdAt: new Date().toISOString(), // Add creation timestamp
      lastModified: new Date().toISOString(), // Add modification timestamp
    };

    // Dispatch action to save pattern
    dispatch(addPattern(pattern));

    // Show detailed success message with Modal
    Modal.success({
      title: "Pattern Saved Successfully",
      content: (
        <div>
          <p>Pattern Name: {patternName}</p>
          <p>Number of Tasks: {Object.keys(taskProperties).length}</p>
          <p>Created At: {new Date().toLocaleString()}</p>
        </div>
      ),
    });
  }, [form, taskProperties, selectedRole, selectedResource, dispatch]);

  // 导出 BPMN XML 格式
  const exportBPMN = useCallback(async () => {
    try {
      if (!modelerRef.current) {
        message.error("BPMN modeler not initialized");
        return;
      }

      const { xml } = await modelerRef.current.saveXML({ format: true });

      const element = document.createElement("a");
      const file = new Blob([xml], { type: "application/xml" });
      element.href = URL.createObjectURL(file);
      element.download = `pattern_${Date.now()}.bpmn`;

      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);

      message.success("BPMN file exported successfully");
    } catch (error) {
      console.error("BPMN export failed:", error);
      message.error("Failed to export BPMN file");
    }
  }, []);

  // 导出 JSON 格式
  const exportJSON = useCallback(() => {
    try {
      const jsonData = {
        name: "pattern",
        tasks: taskProperties,
        roleId: selectedRole?.id,
        resourceId: selectedResource?.id,
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
      console.error("JSON export failed:", error);
      message.error("Failed to export JSON file");
    }
  }, [taskProperties, selectedRole, selectedResource]);

  // 导出菜单项
  const exportMenuItems = {
    items: [
      {
        key: "1",
        label: "Export as BPMN",
        onClick: exportBPMN,
      },
      {
        key: "2",
        label: "Export as JSON",
        onClick: exportJSON,
      },
    ],
  };

  // 添加导入函数
  const handleImport = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const xml = e.target.result;

        // 导入 BPMN XML
        await modelerRef.current.importXML(xml);

        // 更新任务属性
        const elementRegistry = modelerRef.current.get("elementRegistry");
        const tasks = {};

        elementRegistry.forEach((element) => {
          if (element.type === "bpmn:Task") {
            tasks[element.id] = {
              id: element.id,
              name: element.businessObject.name || "",
              type: element.type,
              status: "pending",
              roleId: element.businessObject.roleId,
              resourceId: element.businessObject.resourceId,
            };
          }
        });

        setTaskProperties(tasks);
        message.success("BPMN file imported successfully");
      };

      reader.readAsText(file);
    } catch (error) {
      console.error("Import failed:", error);
      message.error("Failed to import BPMN file");
    }
  }, []);

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

    modelerRef.current = modeler;

    modeler
      .importXML(defaultDiagram)
      .then(() => {
        const canvas = modeler.get("canvas");
        const elementRegistry = modeler.get("elementRegistry");

        // 获取流程元素
        const processElement = elementRegistry.find(
          (element) => element.type === "bpmn:Process"
        );

        setProcessElement(processElement);
        canvas.zoom("fit-viewport");
      })
      .catch((err) => {
        console.error("Error loading diagram:", err);
      });

    return () => {
      modeler.destroy();
    };
  }, []);

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

  const showContextMenu = useCallback((event, menuItems) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      items: menuItems,
    });

    const handleClickOutside = (e) => {
      if (!e.target.closest(".context-menu")) {
        setContextMenu((prev) => ({ ...prev, visible: false }));
        document.removeEventListener("click", handleClickOutside);
      }
    };

    setTimeout(() => document.addEventListener("click", handleClickOutside));
  }, []);

  const handleContextMenu = useCallback(
    (event) => {
      if (!event?.element || event.element.type !== "bpmn:Task") return;

      const menuItems = [
        {
          label: "Insert Task Before",
          action: () => handleTaskOperation(event.element, "before"),
        },
        {
          label: "Insert Task After",
          action: () => handleTaskOperation(event.element, "after"),
        },
        {
          label: "Delete Task",
          action: () => handleDeleteTask(event.element),
        },
      ];
      showContextMenu(event.originalEvent, menuItems);
    },
    [handleTaskOperation, handleDeleteTask, showContextMenu]
  );

  useEffect(() => {
    if (!modelerRef.current) return;
    const eventBus = modelerRef.current.get("eventBus");

    eventBus.on("element.contextmenu", handleContextMenu);

    return () => {
      eventBus.off("element.contextmenu", handleContextMenu);
    };
  }, [handleContextMenu]);

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

    // Cleanup event listeners on unmount
    return () => {
      eventBus.off("rules.canMove");
      eventBus.off(["element.dragstart", "element.move", "element.dragend"]);
      eventBus.off("element.changed");
    };
  }, [modelerRef, handleTaskOperation]);

  // Add movement configuration effect
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const modeling = modelerRef.current.get("modeling");

    // Override default movement rules
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

    // 统一的事件处理函数
    const handleEvents = {
      // 选择事件处理
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

      // 移动事件处理
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

      // ���拽事件处理
      drag: (event) => {
        if (event.element?.type === "bpmn:Task") {
          event.context.canExecute = true;
          event.context.canMove = true;
          event.context.moveParent = false;
        }
      },
    };

    // 注册监听器
    eventBus.on("selection.changed", handleEvents.selection);
    eventBus.on("element.changed", handleEvents.move);
    eventBus.on(
      ["element.dragstart", "element.move", "element.dragend"],
      handleEvents.drag
    );

    return () => {
      // 清理监听器
      eventBus.off("selection.changed", handleEvents.selection);
      eventBus.off("element.changed", handleEvents.move);
      eventBus.off(
        ["element.dragstart", "element.move", "element.dragend"],
        handleEvents.drag
      );
    };
  }, [modelerRef, handleTaskOperation]);

  // 添加一个用于处理 DrilldownOverlay 的 useEffect
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");
    const overlays = modelerRef.current.get("overlays");

    // 处理元素变更事件
    const handleElementChange = (event) => {
      if (!event?.element) return;

      // 确保在元素变更时更新覆盖层
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

      // 事件处理函数...

      // 注册监听器...

      return () => {
        // 清理监听器...
      };
    } catch (error) {
      console.error("Error in event handling:", error);
    }
  }, [handleSelection]);

  // Handle double click event to edit task properties
  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");

    const handleDblClick = (event) => {
      const { element } = event;
      // Only show properties panel for task elements
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

  // Update handleTaskPropertyChange to handle next task
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

  const updatePreviews = useCallback((operation, taskData, newProperties) => {
    // Trigger BPMN task update event
    document.dispatchEvent(
      new CustomEvent("bpmnTaskUpdate", {
        detail: { operation, taskData, allTasks: newProperties },
      })
    );

    // Update Task Chain Preview
    const taskChainPreview = document.querySelector(".task-chain-preview");
    if (taskChainPreview) {
      taskChainPreview.dispatchEvent(
        new CustomEvent("taskUpdate", {
          detail: { operation, taskData, allTasks: newProperties },
        })
      );
    }
  }, []);

  useEffect(() => {
    if (!modelerRef.current) return;

    const eventBus = modelerRef.current.get("eventBus");

    const handleEvents = {
      // Add delete event handler
      delete: (event) => {
        const { element } = event;
        if (element.type === "bpmn:Task") {
          handleTaskOperation("delete", { id: element.id });
        }
      },
      // ... other existing event handlers
    };

    // Register delete event listener
    eventBus.on("shape.remove", handleEvents.delete, HIGH_PRIORITY);

    return () => {
      eventBus.off("shape.remove", handleEvents.delete);
    };
  }, [modelerRef, handleTaskOperation]);

  return (
    <div className="change-pattern-editor">
      <Form form={form} layout="vertical" style={{ marginBottom: 16 }}>
        <Form.Item
          name="name"
          label="Pattern Name"
          rules={[{ required: true, message: "Please input pattern name" }]}
        >
          <Input placeholder="Enter pattern name" />
        </Form.Item>
      </Form>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: "100%" }}>
          <Space>
            <Select
              placeholder="Select Role"
              style={{ width: 200 }}
              value={selectedRole}
              onChange={handleRoleChange}
              options={memoizedRoles.map((role) => ({
                label: role.name,
                value: role.id || role.name,
              }))}
              allowClear
            />
            <Select
              placeholder="Select Resource"
              style={{ width: 200 }}
              value={selectedResource}
              onChange={handleResourceChange}
              options={memoizedResources.map((resource) => ({
                label: resource.name,
                value: resource.id || resource.name,
              }))}
              allowClear
            />
          </Space>
          <Space>
            <Button onClick={() => handleAddTask()}>Add Task</Button>
            <Button
              type="primary"
              onClick={handleSave}
              disabled={!selectedRole || !selectedResource}
            >
              Save Pattern
            </Button>
            <Space>
              {/* 添加文件导入按钮 */}
              <input
                type="file"
                accept=".bpmn,.xml,.json"
                onChange={handleImport}
                style={{ display: "none" }}
                id="bpmn-import"
              />
              <Button
                onClick={() => document.getElementById("bpmn-import").click()}
              >
                Import
              </Button>

              {/* 导出下拉菜单 */}
              <Dropdown menu={exportMenuItems}>
                <Button>
                  Export <DownOutlined />
                </Button>
              </Dropdown>
            </Space>
          </Space>
        </Space>
      </Card>

      <div style={{ display: "flex", gap: "16px", position: "relative" }}>
        <div
          ref={containerRef}
          className="bpmn-container"
          style={{ border: "1px solid #ccc", height: "600px", width: "70%" }}
        />
        {selectedElement && (
          <TaskPropertiesPanel
            selectedElement={selectedElement}
            onPropertyChange={handlePropertyChange}
            onSave={() => {}}
            style={{
              width: "30%",
              background: "#fff",
              padding: "16px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          />
        )}
      </div>

      <Card title="Task Chain Preview" style={{ marginTop: "16px" }}>
        <TaskChainVisualizer
          taskProperties={taskProperties}
          resources={memoizedResources}
        />
      </Card>

      <div className="task-chain-preview" style={{ marginBottom: 16 }}>
        <Card title="Real-time Task Chain">
          <TaskChainPreview
            taskProperties={taskProperties}
            roles={memoizedRoles}
            resources={memoizedResources}
            onTaskStatusChange={updateTaskStatus}
          />
        </Card>
      </div>

      {/* Render context menu when visible */}
      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{
            position: "fixed",
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: "white",
            border: "1px solid #ccc",
            boxShadow: "2px 2px 5px rgba(0,0,0,0.2)",
            padding: "5px 0",
            zIndex: 1000,
          }}
        >
          {/* Map through menu items and render them */}
          {contextMenu.items.map((item, index) => (
            <div
              key={index}
              className="context-menu-item"
              onClick={() => {
                // Execute item action and hide menu
                item.action();
                setContextMenu((prev) => ({ ...prev, visible: false }));
              }}
              style={{
                padding: "5px 15px",
                cursor: "pointer",
                hover: {
                  backgroundColor: "#f0f0f0",
                },
              }}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}

      {/* Properties Panel Modal */}
      <TaskPropertiesPanel
        visible={propertiesPanelVisible}
        selectedElement={selectedElement}
        onPropertyChange={handleTaskPropertyChange}
        onCancel={() => setPropertiesPanelVisible(false)}
        roles={memoizedRoles}
        resources={memoizedResources}
        taskProperties={taskProperties}
      />
    </div>
  );
};

export default ChangePatternEditor;
