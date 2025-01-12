import React from "react";
import { Button, Input, Tree, Table, Select, Form, message } from "antd";
import { useRole } from "../hooks/useRole";

const { Option } = Select;

const RoleManager = () => {
  const {
    form,
    roles,
    roleName,
    parentRole,
    permissions,
    mutuallyExclusiveRoles,
    maxMembers,
    editMode,
    selectedRows,
    setRoleName,
    setParentRole,
    setPermissions,
    setMutuallyExclusiveRoles,
    setMaxMembers,
    setSelectedRows,
    handleAddOrEditRole,
    handleDeleteRole,
    handleBatchDelete,
    openEditMode,
    buildRoleHierarchy,
    inheritedPermissions,
    getRolePermissions,
  } = useRole();

  const handleSubmit = async (values) => {
    try {
      const roleData = {
        name: roleName,
        parent_role: parentRole,
        permissions: permissions
          ? permissions.split(",").map((perm) => ({
              resource: perm.trim(),
            }))
          : [],
        mutually_exclusive_roles: mutuallyExclusiveRoles
          ? mutuallyExclusiveRoles.split(",").map((role) => role.trim())
          : [],
        max_members: maxMembers || null,
      };

      await handleAddOrEditRole(roleData);
      form.resetFields();
    } catch (error) {
      console.error("Failed to submit:", error);
      message.error("Failed to create role: " + error.message);
    }
  };

  const columns = [
    {
      title: "Role Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Superior Role",
      dataIndex: "parent_role",
      key: "parent_role",
      render: (text) => text || "None",
    },
    {
      title: "Permissions",
      key: "permissions",
      render: (_, record) => {
        const permissions = getRolePermissions(record.name);

        return (
          <div>
            {permissions.direct.length > 0 && (
              <div>
                <strong>Direct:</strong>{" "}
                {permissions.direct
                  .map(
                    (perm) =>
                      `${perm.resource}${perm.is_private ? " (private)" : ""}`
                  )
                  .join(", ")}
              </div>
            )}
            {permissions.inherited.length > 0 && (
              <div>
                <strong>Inherited:</strong>{" "}
                {permissions.inherited.map((perm) => perm.resource).join(", ")}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Constraints",
      key: "constraints",
      render: (_, record) => (
        <div>
          <p>
            Mutually exclusive roles:{" "}
            {record.mutually_exclusive_roles?.length > 0
              ? record.mutually_exclusive_roles.join(", ")
              : "None"}
          </p>
          <p>Max Members: {record.max_members || "None"}</p>
        </div>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => openEditMode(record)}>
            Edit
          </Button>
          <Button
            type="link"
            danger
            onClick={() => handleDeleteRole(record.name)}
          >
            Delete
          </Button>
        </>
      ),
    },
  ];

  const RoleForm = ({ form, roles, editMode }) => {
    return (
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="Role Name"
          rules={[{ required: true, message: "Please input role name" }]}
        >
          <Input placeholder="Enter role name" />
        </Form.Item>

        <Form.Item name="parentRole" label="Superior Role">
          <Select
            placeholder="Select superior role"
            allowClear
            options={roles
              .filter((role) => role.id !== form.getFieldValue("id"))
              .map((role) => ({
                label: role.name,
                value: role.id,
              }))}
          />
        </Form.Item>

        <Form.Item name="permissions" label="Permissions">
          <Input placeholder="Enter permissions" />
        </Form.Item>
      </Form>
    );
  };

  return (
    <div>
      <h2>Role Management</h2>
      <Input
        placeholder="Role Name"
        value={roleName}
        onChange={(e) => setRoleName(e.target.value)}
        style={{ width: "200px", marginRight: "10px" }}
      />
      <Select
        placeholder="Selecting the parent role"
        value={parentRole}
        onChange={(value) => setParentRole(value)}
        style={{ width: "200px", marginRight: "10px" }}
        allowClear
      >
        {roles
          .filter((role) => role?.name && role.name !== roleName)
          .map((role) => (
            <Option key={role.id || `role_${role.name}`} value={role.name}>
              {role.name}
            </Option>
          ))}
      </Select>
      <Input
        placeholder="Permissions (separated by commas)"
        value={permissions}
        onChange={(e) => setPermissions(e.target.value)}
        style={{ width: "300px", marginRight: "10px" }}
      />
      <Input
        placeholder="Mutually exclusive roles (separated by commas)"
        value={mutuallyExclusiveRoles}
        onChange={(e) => setMutuallyExclusiveRoles(e.target.value)}
        style={{ width: "300px", marginRight: "10px", marginTop: "10px" }}
      />
      <Input
        placeholder="Maximum number of members"
        value={maxMembers}
        onChange={(e) => setMaxMembers(e.target.value)}
        style={{ width: "200px", marginRight: "10px", marginTop: "10px" }}
      />
      <Button type="primary" onClick={handleSubmit}>
        {editMode ? "Save Edit" : "Add Role"}
      </Button>

      {/* Batch Delete Button */}
      <Button
        type="primary"
        danger
        onClick={handleBatchDelete}
        disabled={selectedRows.length === 0}
        style={{ marginLeft: "10px" }}
      >
        Batch deletion
      </Button>

      <h3 style={{ marginTop: "20px" }}>Hierarchy of Roles</h3>
      <Tree
        showLine
        defaultExpandAll
        treeData={buildRoleHierarchy()}
        style={{ marginBottom: "20px" }}
      />

      <h3 style={{ marginTop: "20px" }}>Role List</h3>
      <Table
        rowSelection={{
          type: "checkbox",
          onChange: (_, selectedRows) => setSelectedRows(selectedRows),
        }}
        dataSource={roles.map((role) => ({
          ...role,
          key: role.id || `role_${role.name}`,
        }))}
        columns={columns}
        pagination={false}
      />
    </div>
  );
};

export default RoleManager;
