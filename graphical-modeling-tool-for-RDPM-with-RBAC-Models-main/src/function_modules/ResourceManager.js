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

  const onFinish = async (values) => {
    try {
      const newResource = {
        name: values.name,
        status: "available",
        description: values.description || null,
      };

      await handleAddResource(newResource);
      form.resetFields();
    } catch (error) {
      console.error("Failed to add resource:", error);
    }
  };

  const columns = [
    {
      title: "Name",
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
            type="primary"
            onClick={() =>
              handleStatusChange(
                record.name,
                record.status === "available" ? "unavailable" : "available"
              )
            }
          >
            Toggle Status
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDeleteResource(record.name)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

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
          dataSource={
            Array.isArray(resources)
              ? resources.map((resource) => ({
                  ...resource,
                  key: resource.name,
                }))
              : []
          }
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default ResourceManager;
