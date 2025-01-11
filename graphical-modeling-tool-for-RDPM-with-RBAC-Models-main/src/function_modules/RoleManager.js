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
  } = useRole();

  const handleSubmit = async () => {
    if (!roleName.trim()) {
      message.error("Role name is required");
      return;
    }

    try {
      const roleData = {
        name: roleName,
        parent_role: parentRole || null,
        permissions: permissions
          ? permissions
              .split(",")
              .map((p) => p.trim())
              .filter((p) => p)
              .map((perm) => {
                const [resource, ...actions] = perm.split(":");
                return {
                  resource,
                  actions: actions.length > 0 ? actions[0].split(" ") : [],
                };
              })
          : [],
        mutually_exclusive_roles: mutuallyExclusiveRoles
          ? mutuallyExclusiveRoles
              .split(",")
              .map((r) => r.trim())
              .filter((r) => r)
          : [],
        max_members: maxMembers ? parseInt(maxMembers, 10) : null,
        inherit_child_permissions: true,
      };

      await handleAddOrEditRole(roleData);
      message.success(`${editMode ? "Updated" : "Created"} role successfully`);
    } catch (error) {
      message.error(error.response?.data?.detail || "Failed to submit role");
      console.error(error);
    }
  };

  const columns = [
    { title: "Role Name", dataIndex: "name", key: "name" },
    {
      title: "Superior Role",
      dataIndex: "parent",
      key: "parent",
      render: (text) => text || "None",
    },
    {
      title: "Permissions",
      key: "permissions",
      render: (_, record) => record.permissions?.join(", ") || "None",
    },
    {
      title: "Constraints",
      key: "constraints",
      render: (_, record) => {
        const constraints = record.constraints || {};
        const mutuallyExclusiveRoles =
          constraints.mutuallyExclusiveRoles?.join(", ") || "None";
        const maxMembers = constraints.maxMembers || "None";
        return (
          <div>
            <p>Mutually exclusive roles: {mutuallyExclusiveRoles}</p>
            <p>Max Members: {maxMembers}</p>
          </div>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <>
          <Button type="link" onClick={() => openEditMode(record)}>
            Edit
          </Button>
          <Button type="link" onClick={() => handleDeleteRole(record.name)}>
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
          .filter((role) => role?.name)
          .map((role) => (
            <Option key={role.name} value={role.name}>
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

      <h3 style={{ marginTop: "20px" }}>hierarchy of roles</h3>
      <Tree treeData={buildRoleHierarchy()} defaultExpandAll />

      <h3 style={{ marginTop: "20px" }}>Role List</h3>
      <Table
        rowSelection={{
          type: "checkbox",
          onChange: (_, selectedRows) => setSelectedRows(selectedRows),
        }}
        dataSource={roles}
        columns={columns}
        rowKey="name"
        pagination={false}
      />
    </div>
  );
};

export default RoleManager;
