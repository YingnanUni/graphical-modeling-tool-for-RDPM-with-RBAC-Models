import React from "react";
import { Button, Input, Select, Table } from "antd";
import { useResource } from "../hooks/useResource";

const { Option } = Select;

const ResourceManager = () => {
  const {
    resources,
    roles,
    resourceName,
    relatedRole,
    changePattern,
    columns,
    selectedRows,
    setResourceName,
    setRelatedRole,
    setChangePattern,
    setSelectedRows,
    handleAddResource,
    handleBatchDelete,
  } = useResource();

  return (
    <div>
      <h2>Resource management</h2>
      <Input
        placeholder="Resource name"
        value={resourceName}
        onChange={(e) => setResourceName(e.target.value)}
        style={{ width: "200px", marginRight: "10px" }}
      />
      <Select
        placeholder="Select Associated Roles"
        value={relatedRole}
        onChange={(value) => setRelatedRole(value)}
        style={{ width: "200px", marginRight: "10px" }}
      >
        {roles
          .filter((role) => role?.name)
          .map((role) => (
            <Option key={role.id} value={role.name}>
              {role.name}
            </Option>
          ))}
      </Select>
      <Select
        placeholder="Select Change patterns"
        value={changePattern}
        onChange={(value) => setChangePattern(value)}
        style={{ width: "200px", marginRight: "10px" }}
      >
        <Option value="Insertion of tasks">Insertion of tasks</Option>
        <Option value="Deletion of tasks">Deletion of tasks</Option>
        <Option value="Replacement of tasks">Replacement of tasks</Option>
      </Select>
      <Button type="primary" onClick={handleAddResource}>
        Additional resources
      </Button>
      {/* New Batch Delete button */}
      <Button
        type="primary"
        danger
        onClick={handleBatchDelete}
        disabled={selectedRows.length === 0}
        style={{ marginLeft: "10px" }}
      >
        Batch deletion
      </Button>

      <Table
        rowSelection={{
          type: "checkbox",
          onChange: (_, rows) => setSelectedRows(rows),
          selectedRowKeys: selectedRows.map((row) => row.id),
        }}
        dataSource={resources}
        columns={columns}
        rowKey="id"
        style={{ marginTop: "20px" }}
      />
    </div>
  );
};

export default ResourceManager;
