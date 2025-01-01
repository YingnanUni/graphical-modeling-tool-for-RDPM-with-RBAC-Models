import React from "react";
import { Form, Input, Select } from "antd";

const TaskForm = ({ form, roles, resources, onValuesChange }) => {
  // Extract form logic from ChangePatternEditor
  return (
    <Form form={form} layout="vertical" onValuesChange={onValuesChange}>
      {/* Form items moved from ChangePatternEditor */}
      <Form.Item name="name" label="Task Name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>

      <Form.Item name="roleId" label="Role" rules={[{ required: true }]}>
        <Select>
          {roles.map((role) => (
            <Select.Option key={role.id} value={role.id}>
              {role.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* Add more form items */}
    </Form>
  );
};

export default TaskForm;
