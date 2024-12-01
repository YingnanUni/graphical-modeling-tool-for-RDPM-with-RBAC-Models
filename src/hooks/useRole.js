// hooks/useRole.js
import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, message } from "antd";
import {
  addRole,
  updateRole,
  deleteRole,
  selectRoles,
} from "../store/roleSlice";

export const useRole = () => {
  // Initialize form and Redux hooks
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const roles = useSelector(selectRoles);

  // State management for role properties
  const [roleName, setRoleName] = useState("");
  const [parentRole, setParentRole] = useState(null);
  const [permissions, setPermissions] = useState("");
  const [mutuallyExclusiveRoles, setMutuallyExclusiveRoles] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]); // For batch operations

  // Reset form to initial state
  const resetForm = useCallback(() => {
    form.resetFields();
    setRoleName("");
    setParentRole(null);
    setPermissions("");
    setMutuallyExclusiveRoles("");
    setMaxMembers("");
    setEditMode(false);
    setSelectedRole(null);
  }, [form]);

  // Convert flat role data to tree structure
  const convertToTreeData = useCallback((roles) => {
    const treeData = [];

    roles.forEach((role) => {
      const node = {
        title: role.name,
        key: role.id,
        children: [],
      };

      if (role.parent) {
        const parentNode = findNodeById(treeData, role.parent);
        if (parentNode) {
          parentNode.children.push(node);
        }
      } else {
        treeData.push(node);
      }
    });

    return treeData;
  }, []);

  // Helper function to find node by ID in tree structure
  const findNodeById = (nodes, id) => {
    for (const node of nodes) {
      if (node.key === id) return node;
      if (node.children) {
        const found = findNodeById(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Handle adding or editing a role
  const handleAddOrEditRole = useCallback(() => {
    if (!roleName) {
      message.error("Please enter role name");
      return;
    }

    const roleData = {
      id: editMode ? selectedRole.id : Date.now().toString(),
      name: roleName,
      parent: parentRole,
      permissions: permissions.split(",").map((p) => p.trim()),
      constraints: {
        mutuallyExclusive: mutuallyExclusiveRoles
          .split(",")
          .map((r) => r.trim()),
        maxMembers: parseInt(maxMembers) || undefined,
      },
    };

    if (editMode) {
      dispatch(updateRole({ id: roleData.id, changes: roleData }));
      message.success("Role updated successfully");
    } else {
      dispatch(addRole(roleData));
      message.success("Role added successfully");
    }

    resetForm();
  }, [
    roleName,
    parentRole,
    permissions,
    mutuallyExclusiveRoles,
    maxMembers,
    editMode,
    selectedRole,
    dispatch,
    resetForm,
  ]);

  // Handle deleting a single role
  const handleDeleteRole = useCallback(
    (roleId) => {
      dispatch(deleteRole(roleId));
      message.success("Role deleted successfully");
    },
    [dispatch]
  );

  // Handle batch deletion of roles
  const handleBatchDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning("Please select the roles to be deleted first");
      return;
    }

    selectedRows.forEach((role) => {
      dispatch(deleteRole(role.id));
    });
    message.success(`Successfully deleted ${selectedRows.length} roles`);
    setSelectedRows([]);
  }, [selectedRows, dispatch]);

  // Handle editing an existing role
  const handleEditRole = useCallback((role) => {
    setEditMode(true);
    setSelectedRole(role);
    setRoleName(role.name);
    setParentRole(role.parent);
    setPermissions(role.permissions.join(", "));
    setMutuallyExclusiveRoles(role.constraints.mutuallyExclusive.join(", "));
    setMaxMembers(role.constraints.maxMembers?.toString() || "");
  }, []);

  // Add buildRoleHierarchy function
  const buildRoleHierarchy = useCallback(() => {
    const roleMap = roles.reduce((map, role) => {
      if (role?.name) {
        map[role.name] = {
          title: role.name,
          key: role.name,
          children: [],
        };
      }
      return map;
    }, {});

    roles.forEach((role) => {
      if (role?.parent && roleMap[role.parent]) {
        roleMap[role.parent].children.push(roleMap[role.name]);
      }
    });

    return Object.values(roleMap).filter(
      (role) => !roles.some((r) => r.name === role.key && r.parent)
    );
  }, [roles]);

  // Add openEditMode function
  const openEditMode = useCallback((role) => {
    setEditMode(true);
    setSelectedRole(role);
    setRoleName(role.name);
    setParentRole(role.parent);
    setPermissions(role.permissions?.join(", ") || "");
    setMutuallyExclusiveRoles(
      role.constraints?.mutuallyExclusive?.join(", ") || ""
    );
    setMaxMembers(role.constraints?.maxMembers?.toString() || "");
  }, []);

  // Return all necessary state and functions
  return {
    form,
    roles,
    roleName,
    setRoleName,
    parentRole,
    setParentRole,
    permissions,
    setPermissions,
    mutuallyExclusiveRoles,
    setMutuallyExclusiveRoles,
    maxMembers,
    setMaxMembers,
    editMode,
    selectedRows,
    setSelectedRows,
    handleAddOrEditRole,
    handleDeleteRole,
    handleBatchDelete,
    handleEditRole,
    convertToTreeData,
    buildRoleHierarchy,
    openEditMode,
  };
};
