import React from "react";
import { Input, Select, Button } from "antd";

const { Option } = Select;

const CustomForm = ({ fields, onSubmit }) => {
  return (
    <form onSubmit={onSubmit}>
      {fields.map((field) => (
        <div key={field.name} style={{ marginBottom: "10px" }}>
          {field.type === "input" && (
            <Input
              placeholder={field.placeholder}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
            />
          )}
          {field.type === "select" && (
            <Select
              placeholder={field.placeholder}
              value={field.value}
              onChange={field.onChange}
              style={{ width: "100%" }}
            >
              {field.options.map((option) => (
                <Option key={option.value} value={option.value}>
                  {option.label}
                </Option>
              ))}
            </Select>
          )}
        </div>
      ))}
      <Button type="primary" htmlType="submit">
        submit
      </Button>
    </form>
  );
};

export default CustomForm;
