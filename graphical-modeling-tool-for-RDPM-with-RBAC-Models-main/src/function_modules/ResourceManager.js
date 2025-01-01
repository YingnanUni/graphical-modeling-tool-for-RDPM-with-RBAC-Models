import React from "react";
import { Button, Input, Table, Form, Badge, Space, Card } from "antd";
import { useResource } from "../hooks/useResource";
import { PlusOutlined } from "@ant-design/icons";

const ResourceManager = () => {
  const {
    resources,
    handleAddResource,
    handleDeleteResource,
    handleStatusChange,
  } = useResource();

  const [form] = Form.useForm();

  // 表格列定义
  const columns = [
    {
      title: "Resource Name",
      dataIndex: "name",
      key: "name",
      width: "40%",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: "30%",
      render: (status) => (
        <Badge
          status={status === "available" ? "success" : "error"}
          text={status === "available" ? "Available" : "Unavailable"}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: "30%",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            onClick={() =>
              handleStatusChange(
                record.id,
                record.status === "available" ? "unavailable" : "available"
              )
            }
          >
            Toggle Status
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDeleteResource(record.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  // 处理表单提交
  const onFinish = (values) => {
    const newResource = {
      id: Date.now().toString(),
      name: values.name,
      type: values.type,
      status: "available",
    };

    handleAddResource(newResource);
    form.resetFields();
  };

  return (
    <div className="resource-manager">
      <Card title="Add New Resource" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={onFinish}>
          <Form.Item
            name="name"
            rules={[{ required: true, message: "Please input resource name!" }]}
            style={{ width: "300px" }}
          >
            <Input placeholder="Resource Name" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
              Add Resource
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Resource List">
        <Table
          columns={columns}
          dataSource={Array.isArray(resources) ? resources : []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ResourceManager;
