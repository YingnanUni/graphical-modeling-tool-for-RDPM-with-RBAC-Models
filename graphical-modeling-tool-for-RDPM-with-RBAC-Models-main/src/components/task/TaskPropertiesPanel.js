import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { DownOutlined } from "@ant-design/icons";

// 2. Ant Design components
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

// 3. Redux selectors
import { selectResources } from "../../store/resourceSlice";
import { selectRoles } from "../../store/roleSlice";
import { selectRoleResources } from "../../store/roleResourceSlice";

// 4. Services
import { AuthorizationService } from "../../services/AuthorizationService";

// 5. Custom components (move to end)
import { ChangePatternModal } from "../bpmn/CustomBpmnRenderer";

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

  // 初始化时设置分配类型
  useEffect(() => {
    if (currentTask.allocationType) {
      setAllocationType(currentTask.allocationType);
    }
  }, [currentTask]);

  // 初始化编辑数据
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
  }, [currentTask]);

  // 添加调试日志
  console.log("Current Task:", currentTask);
  console.log("Selected Role:", selectedRole);
  console.log("Resources:", resources);

  // 根据分配类型设置 Select 的模式
  const getRoleSelectMode = (type) => {
    switch (type) {
      case "n:n":
        return "multiple";
      default:
        return undefined; // 单选模式
    }
  };

  const getResourceSelectMode = (type) => {
    switch (type) {
      case "1:n":
      case "n:n":
        return "multiple";
      default:
        return undefined; // 单选模式
    }
  };

  // 处理分配类型变化
  const handleAllocationTypeChange = (value) => {
    setAllocationType(value);
    // 清除之前的选择
    handlePropertyChange("roleId", undefined);
    handlePropertyChange("resourceId", undefined);
    setSelectedRole(null);
  };

  // 修改资源可用性检查逻辑
  const isResourceAvailable = (resourceId, excludeTaskId) => {
    // 如果是当前任务正在使用的资源，则可用
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

    // 检查其他任务是否使用了该资源
    const isUsedInOtherTasks = Object.entries(taskProperties).some(
      ([taskId, task]) => {
        // 跳过当前任务的检查
        if (taskId === excludeTaskId) return false;

        // 检查直接分配的资源
        if (task.resourceId === resourceId) return true;

        // 检查角色资源分配
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

    // 如果资源是共享的，检查是否超过最大共享数
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

    // 对于非共享资源，如果已被使用则不可用
    return !isUsedInOtherTasks;
  };

  // 检查资源是否已被分配
  const isResourceAllocated = (resourceId, excludeTaskId) => {
    return Object.entries(taskProperties).some(([taskId, task]) => {
      if (taskId === excludeTaskId) return false;

      // 检查直接分配的资源
      if (task.resourceId === resourceId) return true;

      // 检查角色资源分配
      if (task.roleResources) {
        return Object.values(task.roleResources).some((resources) =>
          resources.includes(resourceId)
        );
      }

      return false;
    });
  };

  // 获取可用资源列表
  const getAvailableResources = useMemo(() => {
    if (!resources) return [];

    return resources.map((resource) => {
      // 检查资源是否已被分配
      const isAllocated = Object.entries(taskProperties).some(
        ([taskId, task]) => {
          // 跳过当前任务的检查
          if (taskId === selectedElement?.id) return false;
          return task.resourceId === resource.id;
        }
      );

      // 如果资源是共享的，检查是否达到最大共享数
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

      // 非共享资源
      return {
        ...resource,
        disabled: isAllocated,
        status: isAllocated ? "occupied" : "available",
      };
    });
  }, [resources, taskProperties, selectedElement]);

  const handlePropertyChange = (property, value) => {
    if (!selectedElement) return;

    const updatedTask = {
      ...currentTask,
      [property]: value,
    };

    // 特殊处理 roleId 变化
    if (property === "roleId") {
      setSelectedRole(value);
      // 清除之前选择的资源
      updatedTask.resourceId = undefined;
      // 如果是 n:n 模式，初始化 roleResources
      if (allocationType === "n:n") {
        updatedTask.roleResources = {};
        if (Array.isArray(value)) {
          value.forEach((roleId) => {
            updatedTask.roleResources[roleId] = [];
          });
        }
      }
    }

    // 特殊处理 allocationType 变化
    if (property === "allocationType") {
      setAllocationType(value);
      // 清除之前的选择
      updatedTask.roleId = undefined;
      updatedTask.resourceId = undefined;
      updatedTask.roleResources = {};
    }

    onTaskPropertiesChange(selectedElement.id, updatedTask);

    // 触发资源分配更新事件
    document.dispatchEvent(
      new CustomEvent("resourceAllocationUpdate", {
        detail: {
          taskId: selectedElement.id,
          allocation: updatedTask,
        },
      })
    );
  };

  // 处理角色选择变化
  const handleRoleChange = (value) => {
    const updatedTask = {
      ...currentTask,
      roleId: value,
      // 如果是 n:n，初始化 roleResources
      roleResources: allocationType === "n:n" ? {} : currentTask.roleResources,
    };

    if (allocationType === "n:n") {
      // 为每个选中的角色初始化资源数组
      value.forEach((roleId) => {
        updatedTask.roleResources[roleId] = [];
      });
    }

    onTaskPropertiesChange(selectedElement.id, updatedTask);
  };

  // 处理资源选择变化
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

  // 添加动态校验逻辑
  const validateAllocation = useCallback(
    (values) => {
      const { roleId, resourceId, allocationType } = values;

      // 基本验证
      if (!roleId || !resourceId) {
        return {
          isValid: false,
          message: "Please select both role and resource",
        };
      }

      // 调用授权服务进行验证
      const authResult = AuthorizationService.validateResourceAllocation(
        selectedElement.id,
        roleId,
        resourceId,
        taskProperties,
        resources
      );

      if (!authResult.isValid) {
        message.error(authResult.message);
      }

      return authResult;
    },
    [selectedElement, taskProperties, resources]
  );

  // 修改表单提交处理
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

      message.success("任务属性已更新");
    } catch (error) {
      console.error("验证失败:", error);
      message.error("表单验证失败");
    }
  };

  // 修改资源选项渲染
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

  // 修改角色资源选择渲染
  const renderRoleResourceSelects = () => {
    if (!currentTask.roleId || !Array.isArray(currentTask.roleId)) return null;

    return currentTask.roleId.map((roleId) => {
      const role = roles.find((r) => r.id === roleId);
      // 获取该角色可用的资源
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

  // 在表单上方添加 Change Patterns 按钮组
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
        <Button
          danger
          onClick={() => {
            Modal.confirm({
              title: "Delete Task",
              content: "Are you sure you want to delete this task?",
              onOk: () => handleDeleteTask(selectedElement.id),
            });
          }}
        >
          Delete
        </Button>
      </Space>
    </div>
  );

  // 添加处理删除任务的函数
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

  // 处理任务插入
  const handleChangePattern = (newTaskData, patternType) => {
    if (selectedElement) {
      // 触发 BPMN 任务插入事件
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
    // 检查是否正确获取到resources数据
    console.log("Allocated resources:", resources);

    // 更新BPMN元素的属性
    if (selectedElement) {
      const modeling = bpmnModeler.get("modeling");

      // 更新业务对象
      modeling.updateProperties(selectedElement, {
        "custom:resources": JSON.stringify(resources),
      });
    }
  }

  // 在资源分配对话框确认时
  const handleOk = () => {
    console.log("Resource allocation confirmed");
    console.log("Selected element:", selectedElement);
    console.log("Resources to allocate:", resources);

    // 调用更新后
    console.log("Update completed");
    // 检查元素属性是否更新
    console.log("Updated element properties:", selectedElement.businessObject);
  };

  // 修改保存按钮的处理函数
  const handleSaveChanges = () => {
    if (!selectedElement || !editingData) return;

    // 验证编辑数据
    const validationResult = validateAllocation({
      roleId: editingData.roleId,
      resourceId: editingData.resourceId,
      allocationType: editingData.allocationType,
    });

    if (!validationResult.isValid) {
      message.error(validationResult.message);
      return;
    }

    // 更新任务属性
    onTaskPropertiesChange(selectedElement.id, editingData);

    // 触发资源分配更新事件
    document.dispatchEvent(
      new CustomEvent("resourceAllocationUpdate", {
        detail: {
          taskId: selectedElement.id,
          allocation: editingData,
        },
      })
    );

    setIsEditing(false);
    message.success("Task properties updated successfully");
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
      {/* Change Patterns 按钮组 */}
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
            <Button
              danger
              onClick={() => {
                Modal.confirm({
                  title: "Delete Task",
                  content: "Are you sure you want to delete this task?",
                  onOk: () => handleDeleteTask(selectedElement.id),
                });
              }}
            >
              Delete
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
