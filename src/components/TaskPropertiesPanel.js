import React, { useCallback } from "react";
import { Form, Input, Select, Card, Button, message, Space, Tag } from "antd";
import { useSelector } from "react-redux";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import {
  validateTaskResources,
  validateTaskOperation,
} from "../utils/taskValidation";

/**
 * TaskPropertiesPanel Component
 * Handles the display and editing of task properties in the pattern editor
 *
 * @param {Object} selectedElement - Currently selected task element
 * @param {Function} onPropertyChange - Callback for property changes
 * @param {Function} onSave - Callback for saving changes
 */
const TaskPropertiesPanel = ({
  selectedElement,
  onPropertyChange,
  onSave,
  onDelete,
}) => {
  const [form] = Form.useForm();
  const resources = useSelector((state) => state.resources.resources);
  const tasks = useSelector((state) => state.patterns.tasks);

  // Handle form changes with validation
  const handleFormChange = useCallback(
    (changedValues) => {
      if (!selectedElement?.id) return;

      // Validate resource conflicts
      if (changedValues.resources) {
        const resourceValidation = validateTaskResources(
          changedValues.resources,
          resources
        );
        if (!resourceValidation.isValid) {
          message.error(resourceValidation.message);
          return;
        }
      }

      onPropertyChange(selectedElement.id, changedValues);
    },
    [selectedElement, resources, onPropertyChange]
  );

  // Handle task deletion
  const handleDelete = useCallback(() => {
    if (!selectedElement?.id) return;

    // Validate deletion
    const deleteValidation = validateTaskOperation(
      "delete",
      selectedElement,
      tasks
    );
    if (!deleteValidation.isValid) {
      message.error(deleteValidation.message);
      return;
    }

    onDelete(selectedElement.id);
  }, [selectedElement, tasks, onDelete]);

  return (
    <Card
      title="Task Properties"
      extra={
        <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
          Delete Task
        </Button>
      }
    >
      <Form form={form} layout="vertical" onValuesChange={handleFormChange}>
        {/* Basic Properties */}
        <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>

        {/* Execution Type */}
        <Form.Item name="executionType" label="Execution Type">
          <Select>
            <Select.Option value="sequential">Sequential</Select.Option>
            <Select.Option value="parallel">Parallel</Select.Option>
            <Select.Option value="conditional">Conditional</Select.Option>
          </Select>
        </Form.Item>

        {/* Conditional Logic */}
        {form.getFieldValue("executionType") === "conditional" && (
          <Form.Item name="condition" label="Condition">
            <Input.TextArea placeholder="e.g., quality > 80" />
          </Form.Item>
        )}

        {/* Resource Assignment */}
        <Form.List name="resources">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field, index) => (
                <Space key={field.key} align="baseline">
                  <Form.Item
                    {...field}
                    label={index === 0 ? "Resources" : ""}
                    required={false}
                  >
                    <Select style={{ width: 200 }}>
                      {resources.map((resource) => (
                        <Select.Option
                          key={resource.id}
                          value={resource.id}
                          disabled={resource.status === "Occupied"}
                        >
                          {resource.name}
                          <Tag
                            color={
                              resource.status === "Available" ? "green" : "red"
                            }
                          >
                            {resource.status}
                          </Tag>
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <DeleteOutlined onClick={() => remove(field.name)} />
                </Space>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                >
                  Add Resource
                </Button>
              </Form.Item>
            </>
          )}
        </Form.List>

        {/* Save Button */}
        <Form.Item>
          <Button type="primary" onClick={onSave}>
            Save Changes
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default TaskPropertiesPanel;
