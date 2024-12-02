import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Modal, Form, Input, Select, Space, Button, message, Tag } from "antd";
import { validateNextTaskSelection } from "../utils/taskValidation";

/**
 * TaskPropertiesPanel Component
 * Displays a modal dialog for editing task properties
 *
 * @param {Object} props Component properties
 * @param {boolean} props.visible Controls modal visibility
 * @param {Object} props.selectedElement Selected BPMN task element
 * @param {Function} props.onPropertyChange Callback when properties change
 * @param {Function} props.onCancel Callback when modal is closed
 * @param {Array} props.roles Available roles list
 * @param {Array} props.resources Available resources list
 * @param {Object} props.taskProperties Available task properties
 */
const TaskPropertiesPanel = ({
  visible,
  selectedElement,
  onPropertyChange,
  onCancel,
  roles = [],
  resources = [],
  taskProperties = {},
}) => {
  const [form] = Form.useForm();
  const [executionType, setExecutionType] = useState("sequential");
  const [triggerConditions, setTriggerConditions] = useState([]);

  // Get available tasks for Next Task selection (excluding current task)
  const availableNextTasks = useMemo(() => {
    if (!selectedElement) return [];

    return Object.entries(taskProperties)
      .filter(([id]) => id !== selectedElement.id)
      .map(([id, task]) => ({
        value: id,
        label: task.name || "Unnamed Task",
      }));
  }, [taskProperties, selectedElement]);

  // Update form values when selected element changes
  useEffect(() => {
    if (selectedElement?.businessObject) {
      form.setFieldsValue({
        name: selectedElement.businessObject.name,
        roleId: selectedElement.businessObject.roleId,
        resourceId: selectedElement.businessObject.resourceId,
        nextTaskId: selectedElement.businessObject.nextTaskId,
      });
    }
  }, [selectedElement, form]);

  // Generate dynamic trigger conditions based on selected resource
  useEffect(() => {
    const resourceId = form.getFieldValue("resourceId");
    if (resourceId) {
      const resource = resources.find((r) => r.id === resourceId);
      const conditions = [
        {
          value: "resourceAvailable",
          label: `Resource ${resource?.name} Available`,
        },
        { value: "taskCompleted", label: "Previous Task Completed" },
        { value: "custom", label: "Custom Condition" },
      ];
      setTriggerConditions(conditions);
    }
  }, [form.getFieldValue("resourceId"), resources]);

  // Enhanced form submission with error handling
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      onPropertyChange(selectedElement.id, values);
      onCancel();
    } catch (error) {
      // Don't throw error, just log it
      console.warn("Form validation failed:", error);
      // Form validation will show error messages automatically
    }
  };

  // Get resource status for display
  const getResourceStatus = useCallback(
    (resourceId) => {
      const resourceTasks = Object.values(taskProperties).filter(
        (task) => task.resourceId === resourceId && task.status === "active"
      );
      return resourceTasks.length > 0 ? "occupied" : "available";
    },
    [taskProperties]
  );

  // Resource options with status
  const resourceOptions = useMemo(() => {
    return resources.map((resource) => ({
      value: resource.id,
      label: `${resource.name} (${getResourceStatus(resource.id)})`,
      disabled: getResourceStatus(resource.id) === "occupied",
    }));
  }, [resources, getResourceStatus]);

  return (
    <Modal
      title="Edit Task Properties"
      open={visible}
      onOk={handleSubmit}
      onCancel={onCancel}
      width={600}
      maskClosable={false}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
          <Input placeholder="Enter task name" />
        </Form.Item>

        <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
          <Select
            placeholder="Select role"
            showSearch
            optionFilterProp="children"
          >
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
          tooltip="Select an available resource"
        >
          <Select
            placeholder="Select resource"
            options={resourceOptions}
            optionRender={(option) => (
              <Space>
                <span>{option.label}</span>
                <Tag color={option.data.disabled ? "red" : "green"}>
                  {option.data.disabled ? "Occupied" : "Available"}
                </Tag>
              </Space>
            )}
          />
        </Form.Item>

        <Form.Item
          name="executionType"
          label="Execution Type"
          rules={[{ required: true }]}
        >
          <Select
            onChange={(value) => setExecutionType(value)}
            options={[
              { value: "sequential", label: "Sequential" },
              { value: "parallel", label: "Parallel" },
              { value: "conditional", label: "Conditional" },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="triggerCondition"
          label="Trigger Condition"
          rules={[{ required: executionType === "conditional" }]}
        >
          <Select
            mode="multiple"
            placeholder="Select trigger conditions"
            options={triggerConditions}
          />
        </Form.Item>

        <Form.Item
          noStyle
          shouldUpdate={(prevValues, currentValues) =>
            prevValues.triggerCondition !== currentValues.triggerCondition
          }
        >
          {({ getFieldValue }) => {
            const conditions = getFieldValue("triggerCondition") || [];
            return conditions.includes("custom") ? (
              <Form.Item
                name="customCondition"
                label="Custom Condition"
                rules={[{ required: true }]}
              >
                <Input.TextArea placeholder="Enter custom condition (e.g., resource.status === 'available')" />
              </Form.Item>
            ) : null;
          }}
        </Form.Item>

        {/* Add Next Task Selection */}
        <Form.Item
          name="nextTaskId"
          label="Next Task"
          tooltip="Select the task that should follow this one"
        >
          <Select
            placeholder="Select next task"
            allowClear
            showSearch
            optionFilterProp="children"
          >
            {Object.entries(taskProperties)
              .filter(([id]) => id !== selectedElement?.id) // Exclude current task
              .map(([id, task]) => (
                <Select.Option key={id} value={id}>
                  {task.name || "Unnamed Task"}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TaskPropertiesPanel;
