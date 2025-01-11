/**
 * TaskPropertiesPanel Component
 *
 * Main functionalities:
 * 1. Task Properties Management
 *    - Handles task name, allocation type, and resource assignments
 *    - Supports different allocation patterns (1:1, 1:n, n:n)
 *
 * 2. Resource Allocation
 *    - Manages relationships between roles and resources
 *    - Handles shared and exclusive resource allocation
 *    - Validates resource availability and allocation rules
 *
 * 3. Change Pattern Management
 *    - Supports BPMN pattern operations (insert before/after/parallel, replace)
 *    - Handles task deletion and pattern changes
 *
 * 4. State Management
 *    - Uses Redux for managing roles, resources, and role-resource relationships
 *    - Maintains local state for editing and UI interactions
 *
 * 5. Form Handling
 *    - Provides form interface for task property editing
 *    - Implements validation and error handling
 *    - Manages edit/view modes for property updates
 */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DownOutlined } from "@ant-design/icons";
import {
  Form,
  Select,
  Card,
  Input,
  Button,
  message,
  Radio,
  Space,
  Dropdown,
  Menu,
  Modal,
  Tag,
} from "antd";
import { selectResources } from "../../store/resourceSlice";
import { selectRoles } from "../../store/roleSlice";
import { selectRoleResources } from "../../store/roleResourceSlice";
import { ChangePatternModal } from "../bpmn/CustomBpmnRenderer";
import { validateResourceAllocation } from "../../utils/taskValidation";

const TaskPropertiesPanel = ({
  selectedElement,
  taskProperties,
  onTaskPropertiesChange,
}) => {
  const [form] = Form.useForm();

  const resources = useSelector(selectResources);
  const roles = useSelector(selectRoles);
  const roleResources = useSelector(selectRoleResources);
  const dispatch = useDispatch();

  const [selectedRole, setSelectedRole] = useState(null);
  const [allocationType, setAllocationType] = useState("1:1");
  const [isSharedResource, setIsSharedResource] = useState(false);
  const [maxShares, setMaxShares] = useState(1);

  const [isEditing, setIsEditing] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const [changePatternVisible, setChangePatternVisible] = useState(false);
  const [patternType, setPatternType] = useState(null);

  const [bpmnModeler, setBpmnModeler] = useState(null);

  const currentTask = selectedElement
    ? taskProperties[selectedElement.id] || {}
    : {};

  const handlePropertyChange = useCallback(
    (property, value) => {
      if (!selectedElement) return;

      const updatedTask = {
        ...currentTask,
        [property]: value,
      };

      onTaskPropertiesChange(selectedElement.id, updatedTask);

      requestAnimationFrame(() => {
        document.dispatchEvent(
          new CustomEvent("resourceAllocationUpdate", {
            detail: {
              taskId: selectedElement.id,
              allocation: updatedTask,
            },
          })
        );
      });
    },
    [selectedElement?.id, currentTask, onTaskPropertiesChange]
  );

  const handleAllocationTypeChange = useCallback(
    (value) => {
      setAllocationType(value);
      handlePropertyChange("roleId", undefined);
      handlePropertyChange("resourceId", undefined);
      setSelectedRole(null);
    },
    [handlePropertyChange]
  );

  useEffect(() => {
    if (currentTask.allocationType) {
      setAllocationType(currentTask.allocationType);
    }
  }, [currentTask]);

  useEffect(() => {
    if (currentTask) {
      setEditingData({
        name: currentTask.name,
        allocationType: currentTask.allocationType || "1:1",
        roleId: currentTask.roleId,
        resourceId: currentTask.resourceId,
        isShared: currentTask.isShared || false,
      });
    }
  }, [currentTask?.id]);

  console.log("Current Task:", currentTask);
  console.log("Selected Role:", selectedRole);
  console.log("Resources:", resources);

  const getRoleSelectMode = (type) => {
    switch (type) {
      case "n:n":
        return "multiple";
      default:
        return undefined;
    }
  };

  const getResourceSelectMode = (type) => {
    switch (type) {
      case "1:n":
      case "n:n":
        return "multiple";
      default:
        return undefined;
    }
  };

  const isResourceAvailable = (resourceId, excludeTaskId) => {
    const currentTask = taskProperties[excludeTaskId];
    if (currentTask) {
      if (currentTask.resourceId === resourceId) return true;
      if (
        currentTask.roleResources &&
        Object.values(currentTask.roleResources).some((resources) =>
          resources.includes(resourceId)
        )
      ) {
        return true;
      }
    }

    const isUsedInOtherTasks = Object.entries(taskProperties).some(
      ([taskId, task]) => {
        if (taskId === excludeTaskId) return false;

        if (task.resourceId === resourceId) return true;

        if (task.roleResources) {
          return Object.values(task.roleResources).some((resources) =>
            resources.includes(resourceId)
          );
        }

        return false;
      }
    );

    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return false;

    if (resource.isShared) {
      const currentShares = Object.values(taskProperties).reduce(
        (count, task) => {
          if (task.resourceId === resourceId) count++;
          if (task.roleResources) {
            Object.values(task.roleResources).forEach((resources) => {
              if (resources.includes(resourceId)) count++;
            });
          }
          return count;
        },
        0
      );

      return currentShares < (resource.maxShares || 1);
    }

    return !isUsedInOtherTasks;
  };

  const isResourceAllocated = (resourceId, excludeTaskId) => {
    return Object.entries(taskProperties).some(([taskId, task]) => {
      if (taskId === excludeTaskId) return false;

      if (task.resourceId === resourceId) return true;

      if (task.roleResources) {
        return Object.values(task.roleResources).some((resources) =>
          resources.includes(resourceId)
        );
      }

      return false;
    });
  };

  const getAvailableResources = useMemo(() => {
    if (!resources) return [];

    return resources.map((resource) => {
      const isAllocated = Object.entries(taskProperties).some(
        ([taskId, task]) => {
          if (taskId === selectedElement?.id) return false;
          return task.resourceId === resource.id;
        }
      );

      if (resource.isShared) {
        const currentShares = Object.values(taskProperties).filter(
          (task) => task.resourceId === resource.id
        ).length;

        return {
          ...resource,
          disabled: currentShares >= (resource.maxShares || 1),
          status:
            currentShares >= (resource.maxShares || 1)
              ? "occupied"
              : "available",
        };
      }

      return {
        ...resource,
        disabled: isAllocated,
        status: isAllocated ? "occupied" : "available",
      };
    });
  }, [resources, taskProperties, selectedElement]);

  const handleRoleChange = (value) => {
    const updatedTask = {
      ...currentTask,
      roleId: value,

      roleResources: allocationType === "n:n" ? {} : currentTask.roleResources,
    };

    if (allocationType === "n:n") {
      value.forEach((roleId) => {
        updatedTask.roleResources[roleId] = [];
      });
    }

    onTaskPropertiesChange(selectedElement.id, updatedTask);
  };

  const handleResourceChange = (roleId, value) => {
    const updatedRoleResources = {
      ...currentTask.roleResources,
      [roleId]: Array.isArray(value) ? value : [value],
    };

    onTaskPropertiesChange(selectedElement.id, {
      ...currentTask,
      roleResources: updatedRoleResources,
    });
  };

  const validateAllocation = useCallback(
    (values) => {
      const { roleId, resourceId, allocationType } = values;

      if (!roleId || !resourceId) {
        return {
          isValid: false,
          message: "Please select both role and resource",
        };
      }

      const isValid = validateResourceAllocation(
        resourceId,
        selectedElement.id,
        taskProperties,
        resources
      );

      if (!isValid) {
        message.error("Invalid resource allocation");
      }

      return {
        isValid,
        message: isValid ? "Success" : "Invalid resource allocation",
      };
    },
    [selectedElement, taskProperties, resources]
  );

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const validationResult = validateAllocation(values);

      if (!validationResult.isValid) {
        return;
      }

      onTaskPropertiesChange(selectedElement.id, {
        ...taskProperties[selectedElement.id],
        ...values,
      });

      message.success("Task properties updated");
    } catch (error) {
      console.error("Validation failed:", error);
      message.error("Form validation failed");
    }
  };

  const renderResourceOptions = () => {
    return getAvailableResources.map((resource) => (
      <Select.Option
        key={resource.id}
        value={resource.id}
        disabled={resource.disabled}
      >
        <Space>
          {resource.name}
          <Tag color={resource.status === "occupied" ? "red" : "green"}>
            {resource.status === "occupied" ? "Occupied" : "Available"}
          </Tag>
          {resource.isShared && (
            <Tag color="blue">
              Shared (
              {
                Object.values(taskProperties).filter(
                  (task) => task.resourceId === resource.id
                ).length
              }
              /{resource.maxShares || 1})
            </Tag>
          )}
        </Space>
      </Select.Option>
    ));
  };

  const renderRoleResourceSelects = () => {
    if (!currentTask.roleId || !Array.isArray(currentTask.roleId)) return null;

    return currentTask.roleId.map((roleId) => {
      const role = roles.find((r) => r.id === roleId);

      const roleAvailableResources = getAvailableResources.filter((resource) =>
        roleResources[roleId]?.includes(resource.id)
      );

      return (
        <Form.Item key={roleId} label={`Resources for ${role?.name || roleId}`}>
          <Select
            value={currentTask.roleResources?.[roleId] || []}
            onChange={(value) => handleResourceChange(roleId, value)}
            placeholder="Select resource"
            mode="multiple"
          >
            {renderResourceOptions(roleAvailableResources)}
          </Select>
        </Form.Item>
      );
    });
  };

  const renderChangePatternButtons = () => (
    <div
      style={{
        marginBottom: 16,
        borderBottom: "1px solid #f0f0f0",
        padding: "8px 0",
      }}
    >
      <Space>
        <Dropdown
          overlay={
            <Menu
              onClick={({ key }) => {
                setPatternType(key);
                setChangePatternVisible(true);
              }}
            >
              <Menu.Item key="before">Insert Before</Menu.Item>
              <Menu.Item key="after">Insert After</Menu.Item>
              <Menu.Item key="parallel">Insert Parallel</Menu.Item>
            </Menu>
          }
        >
          <Button type="primary">
            Insert <DownOutlined />
          </Button>
        </Dropdown>
        <Button
          onClick={() => {
            setPatternType("replace");
            setChangePatternVisible(true);
          }}
        >
          Replace
        </Button>
      </Space>
    </div>
  );

  const handleDeleteTask = useCallback(
    (taskId) => {
      try {
        onTaskPropertiesChange(taskId, null);
        message.success("Task deleted successfully");
      } catch (error) {
        console.error("Error deleting task:", error);
      }
    },
    [onTaskPropertiesChange]
  );

  const handleChangePattern = (newTaskData, patternType) => {
    if (selectedElement) {
      document.dispatchEvent(
        new CustomEvent("bpmnTaskInsert", {
          detail: {
            newTask: newTaskData,
            patternType,
            currentTaskId: selectedElement.id,
          },
        })
      );
    }
  };

  function handleResourceAllocation(resources) {
    console.log("Allocated resources:", resources);

    if (selectedElement) {
      const modeling = bpmnModeler.get("modeling");

      modeling.updateProperties(selectedElement, {
        "custom:resources": JSON.stringify(resources),
      });
    }
  }

  const handleOk = () => {
    console.log("Resource allocation confirmed");
    console.log("Selected element:", selectedElement);
    console.log("Resources to allocate:", resources);

    console.log("Update completed");

    console.log("Updated element properties:", selectedElement.businessObject);
  };

  const handleSaveChanges = () => {
    if (!selectedElement || !editingData) return;

    let resourcesForValidation;
    if (editingData.allocationType === "n:n") {
      console.log("Role Resources:", editingData.roleResources);

      if (
        editingData.roleResources &&
        typeof editingData.roleResources === "object"
      ) {
        resourcesForValidation = [];

        Object.entries(editingData.roleResources).forEach(
          ([roleId, resources]) => {
            if (Array.isArray(resources)) {
              resourcesForValidation.push(...resources);
            } else if (resources) {
              resourcesForValidation.push(resources);
            }
          }
        );
      } else {
        resourcesForValidation = [];
      }

      resourcesForValidation = [...new Set(resourcesForValidation)];

      console.log("Resources for validation:", resourcesForValidation);

      if (!resourcesForValidation || resourcesForValidation.length === 0) {
        message.error("Please allocate resources for roles");
        return;
      }
    } else {
      resourcesForValidation = editingData.resourceId;
    }

    const isValid = validateResourceAllocation(
      resourcesForValidation,
      selectedElement.id,
      taskProperties,
      resources
    );

    if (!isValid) {
      message.error("Invalid resource allocation");
      return;
    }

    const updatedTaskData = {
      ...taskProperties[selectedElement.id],
      ...editingData,
      id: selectedElement.id,
      allocationType: editingData.allocationType || allocationType || "1:1",
      name: editingData.name,
      roleId: editingData.roleId,
      resourceId: resourcesForValidation,
      isShared: editingData.isShared,
      roleResources: editingData.roleResources,
    };

    onTaskPropertiesChange(selectedElement.id, updatedTaskData);

    document.dispatchEvent(
      new CustomEvent("taskSelected", {
        detail: {
          task: selectedElement,
          taskData: updatedTaskData,
        },
      })
    );

    document.dispatchEvent(
      new CustomEvent("resourceAllocationUpdate", {
        detail: {
          taskId: selectedElement.id,
          taskData: updatedTaskData,
        },
      })
    );

    setIsEditing(false);
    message.success("Task properties updated");
  };

  return (
    <Card
      title="Task Properties"
      extra={
        <Button type="link" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? "Cancel Edit" : "Edit"}
        </Button>
      }
    >
      {/* Change Patterns button group */}
      {selectedElement?.id && (
        <div
          style={{
            marginBottom: 16,
            borderBottom: "1px solid #f0f0f0",
            padding: "8px 0",
          }}
        >
          <Space>
            <Dropdown
              overlay={
                <Menu
                  onClick={({ key }) => {
                    setPatternType(key);
                    setChangePatternVisible(true);
                  }}
                >
                  <Menu.Item key="before">Insert Before</Menu.Item>
                  <Menu.Item key="after">Insert After</Menu.Item>
                  <Menu.Item key="parallel">Insert Parallel</Menu.Item>
                </Menu>
              }
            >
              <Button type="primary">
                Insert <DownOutlined />
              </Button>
            </Dropdown>
            <Button
              onClick={() => {
                setPatternType("replace");
                setChangePatternVisible(true);
              }}
            >
              Replace
            </Button>
          </Space>
        </div>
      )}

      <Form form={form} layout="vertical">
        <Form.Item label="Task Name">
          <Input
            value={isEditing ? editingData?.name : currentTask.name}
            onChange={(e) => handlePropertyChange("name", e.target.value)}
            disabled={!isEditing}
          />
        </Form.Item>

        <Form.Item label="Allocation Type">
          <Radio.Group
            value={isEditing ? editingData?.allocationType : allocationType}
            onChange={(e) =>
              handlePropertyChange("allocationType", e.target.value)
            }
            disabled={!isEditing}
          >
            <Radio.Button value="1:1">1:1</Radio.Button>
            <Radio.Button value="1:n">1:n</Radio.Button>
            <Radio.Button value="n:n">n:n</Radio.Button>
          </Radio.Group>
        </Form.Item>

        <Form.Item label="Associated Role">
          <Select
            mode={allocationType === "n:n" ? "multiple" : undefined}
            value={isEditing ? editingData?.roleId : currentTask.roleId}
            onChange={(value) => handlePropertyChange("roleId", value)}
            disabled={!isEditing}
            placeholder="Select role"
          >
            {roles.map((role) => (
              <Select.Option key={role.id} value={role.id}>
                {role.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {editingData?.allocationType === "n:n" ? (
          renderRoleResourceSelects()
        ) : (
          <Form.Item label="Associated Resource">
            <Select
              mode={
                editingData?.allocationType === "1:n" ? "multiple" : undefined
              }
              value={
                isEditing ? editingData?.resourceId : currentTask.resourceId
              }
              onChange={(value) => {
                if (isEditing) {
                  setEditingData({
                    ...editingData,
                    resourceId: value,
                  });
                } else {
                  handlePropertyChange("resourceId", value);
                }
              }}
              disabled={!isEditing}
              placeholder="Select resource"
            >
              {renderResourceOptions()}
            </Select>
          </Form.Item>
        )}

        <Form.Item label="Resource Sharing">
          <Radio.Group
            value={isEditing ? editingData?.isShared : isSharedResource}
            onChange={(e) => {
              if (isEditing) {
                setEditingData({
                  ...editingData,
                  isShared: e.target.value,
                });
              } else {
                setIsSharedResource(e.target.value);
              }
            }}
            disabled={!isEditing}
          >
            <Radio value={false}>Exclusive</Radio>
            <Radio value={true}>Shared</Radio>
          </Radio.Group>
        </Form.Item>

        {isEditing && (
          <Form.Item>
            <Space>
              <Button type="primary" onClick={handleSaveChanges}>
                Save Changes
              </Button>
              <Button onClick={() => setIsEditing(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        )}
      </Form>

      {/* Change Pattern Modal */}
      <ChangePatternModal
        visible={changePatternVisible}
        onCancel={() => setChangePatternVisible(false)}
        onConfirm={(newTaskData) => {
          handleChangePattern(newTaskData, patternType);
          setChangePatternVisible(false);
        }}
        patternType={patternType}
        currentTask={selectedElement}
      />
    </Card>
  );
};

export default TaskPropertiesPanel;
