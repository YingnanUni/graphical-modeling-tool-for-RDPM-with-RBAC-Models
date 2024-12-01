// RoleResourceManager.js
import React from "react";
import { Select, Button, Table, Tree } from "antd";
import { useRoleResource } from "../hooks/useRoleResource";

const { Option } = Select;

const RoleResourceManager = () => {
  const {
    roles,
    resources,
    selectedRole,
    selectedResource,
    selectedRows,
    dataSource,
    editingRole,
    setSelectedRole,
    setSelectedResource,
    setSelectedRows,
    assignResource,
    startEditing,
    handleBatchDelete,
    buildRoleTree,
  } = useRoleResource();

  const columns = [
    { title: "Role name", dataIndex: "role", key: "role" },
    {
      title: "Allocated resources",
      dataIndex: "resources",
      key: "resources",
      render: (resources) =>
        resources.length > 0
          ? resources.map((resource) => (
              <span key={resource} style={{ marginRight: "8px" }}>
                {resource}
              </span>
            ))
          : "None",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button type="link" onClick={() => startEditing(record.role)}>
          Edit
        </Button>
      ),
    },
  ];

  const rowSelection = {
    type: "checkbox",
    onChange: (_, rows) => {
      setSelectedRows(rows);
    },
    onSelectAll: (selected, selectedRows) => {
      setSelectedRows(selected ? selectedRows : []);
    },
  };

  return (
    <div>
      <h2>Role and resource management</h2>

      <Select
        placeholder="Select a role"
        value={selectedRole}
        onChange={setSelectedRole}
        style={{ width: 200, marginRight: 10 }}
      >
        {roles.map((role) => (
          <Option key={role.name} value={role.name}>
            {role.name}
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Select a resource"
        value={selectedResource}
        onChange={setSelectedResource}
        style={{ width: 200, marginRight: 10 }}
        disabled={!selectedRole}
      >
        {resources.map((resource) => (
          <Option key={resource.name} value={resource.name}>
            {resource.name}
          </Option>
        ))}
      </Select>

      <Button
        type="primary"
        onClick={assignResource}
        disabled={!selectedRole || !selectedResource}
      >
        {editingRole ? "Modification of allocation" : "Resource allocation"}
      </Button>

      <Button
        type="primary"
        danger
        onClick={handleBatchDelete}
        disabled={selectedRows.length === 0}
        style={{ marginLeft: 10 }}
      >
        Batch deletion
      </Button>

      <h3 style={{ marginTop: 20 }}>hierarchy of roles</h3>
      <Tree treeData={buildRoleTree()} defaultExpandAll />

      <h3 style={{ marginTop: 20 }}>Status of allocated resources</h3>
      <Table
        rowSelection={rowSelection}
        columns={columns}
        dataSource={dataSource}
        rowKey="role"
        pagination={false}
      />
    </div>
  );
};

export default RoleResourceManager;
