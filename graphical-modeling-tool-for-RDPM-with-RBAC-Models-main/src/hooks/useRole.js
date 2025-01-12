// hooks/useRole.js
import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Form, message, Input } from "antd";
import {
  addRole,
  updateRole,
  deleteRole,
  selectRoles,
} from "../store/roleSlice";
import { RoleService } from "../services/RoleService";

export const useRole = () => {
  // State declarations first
  const [form] = Form.useForm();
  const dispatch = useDispatch();
  const roles = useSelector(selectRoles);
  const [roleName, setRoleName] = useState("");
  const [parentRole, setParentRole] = useState(null);
  const [permissions, setPermissions] = useState("");
  const [mutuallyExclusiveRoles, setMutuallyExclusiveRoles] = useState("");
  const [maxMembers, setMaxMembers] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [inheritedPermissions, setInheritedPermissions] = useState([]);

  // Define resetForm first
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

  // Define validateRoleHierarchy
  const validateRoleHierarchy = useCallback(
    (roleData) => {
      const checkCycle = (roleName, visited = new Set()) => {
        if (visited.has(roleName)) {
          return false; // Cycle detected
        }

        visited.add(roleName);
        const role = roles.find((r) => r.name === roleName);

        if (role && role.parent_role) {
          return checkCycle(role.parent_role, visited);
        }

        return true;
      };

      return checkCycle(roleData.name);
    },
    [roles]
  );

  // Then define handleAddOrEditRole
  const handleAddOrEditRole = useCallback(
    async (roleData) => {
      try {
        if (roleData.parent_role && !validateRoleHierarchy(roleData)) {
          throw new Error(
            "Invalid role hierarchy: Circular inheritance detected"
          );
        }

        // Parse permissions string into structured format
        const parsedPermissions = permissions
          .split(",")
          .map((perm) => {
            const trimmedPerm = perm.trim();
            // Check if permission is marked as private with '*' prefix
            const isPrivate = trimmedPerm.startsWith("*");
            return {
              resource: isPrivate ? trimmedPerm.substring(1) : trimmedPerm,
              actions: ["read", "write"], // Default actions
              is_private: isPrivate,
            };
          })
          .filter((perm) => perm.resource); // Filter out empty permissions

        const formattedData = {
          name: roleData.name,
          parent_role: parentRole, // Use the current parentRole state
          permissions: parsedPermissions,
          mutually_exclusive_roles: roleData.mutually_exclusive_roles || [],
          max_members: roleData.max_members,
          inherit_permissions: true, // Always enable inheritance
        };

        if (editMode) {
          await RoleService.updateRole(selectedRole.name, formattedData);
          dispatch(
            updateRole({
              id: selectedRole.id,
              changes: {
                ...formattedData,
                parent_role: parentRole, // Ensure parent role is updated
              },
            })
          );
        } else {
          const response = await RoleService.createRole(formattedData);
          dispatch(
            addRole({
              ...formattedData,
              id: response.data.id || `role_${formattedData.name}`,
              parent_role: parentRole,
            })
          );
        }

        resetForm();
      } catch (error) {
        console.error("Failed to handle role:", error);
        throw error;
      }
    },
    [
      editMode,
      selectedRole,
      dispatch,
      resetForm,
      validateRoleHierarchy,
      permissions,
      parentRole,
    ]
  );

  // Enhanced getRolePermissions to handle correct inheritance direction
  const getRolePermissions = useCallback(
    (roleName) => {
      const role = roles.find((r) => r.name === roleName);
      if (!role) return { direct: [], inherited: [] };

      // Get direct permissions of current role
      const directPermissions = (role.permissions || []).map((perm) => ({
        resource: typeof perm === "string" ? perm : perm.resource,
        is_private: typeof perm === "object" ? perm.is_private : false,
      }));

      // Get inherited permissions
      let inheritedPermissions = [];

      // Find all roles that have this role as their parent
      const childRoles = roles.filter((r) => r.parent_role === roleName);

      // Collect permissions from child roles
      childRoles.forEach((childRole) => {
        const childPerms = getRolePermissions(childRole.name);
        // Add both direct and inherited permissions from child
        inheritedPermissions = [
          ...inheritedPermissions,
          ...childPerms.direct.filter((perm) => !perm.is_private),
          ...childPerms.inherited,
        ];
      });

      // Remove duplicates
      inheritedPermissions = inheritedPermissions.filter(
        (perm, index, self) =>
          index === self.findIndex((p) => p.resource === perm.resource)
      );

      return {
        direct: directPermissions,
        inherited: inheritedPermissions,
      };
    },
    [roles]
  );

  // Handle deleting a single role
  const handleDeleteRole = useCallback(
    async (roleNameOrId) => {
      try {
        await RoleService.deleteRole(roleNameOrId);
        const roleToDelete = roles.find(
          (role) => role.id === roleNameOrId || role.name === roleNameOrId
        );

        if (roleToDelete) {
          dispatch(deleteRole(roleToDelete.id));
          message.success("Role deleted successfully");
        } else {
          message.error("Role not found");
        }
      } catch (error) {
        message.error(`Failed to delete: ${error.message}`);
      }
    },
    [dispatch, roles]
  );

  // Handle batch deletion
  const handleBatchDelete = useCallback(async () => {
    if (selectedRows.length === 0) {
      message.warning("Please select roles to delete first");
      return;
    }

    try {
      for (const role of selectedRows) {
        await RoleService.deleteRole(role.name);
        dispatch(deleteRole(role.id));
      }
      message.success(`Successfully deleted ${selectedRows.length} roles`);
      setSelectedRows([]);
    } catch (error) {
      message.error(`Batch deletion failed: ${error.message}`);
    }
  }, [selectedRows, dispatch]);

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

  // Enhanced buildRoleHierarchy function
  const buildRoleHierarchy = useCallback(() => {
    // Create a map of roles for quick lookup
    const roleMap = new Map();
    roles.forEach((role) => {
      if (role?.name) {
        const permissions = getRolePermissions(role.name);
        roleMap.set(role.name, {
          title: (
            <div>
              <strong>{role.name}</strong>
              {permissions.direct.length > 0 && (
                <div style={{ fontSize: "12px", color: "#666" }}>
                  Direct: {permissions.direct.map((p) => p.resource).join(", ")}
                </div>
              )}
              {permissions.inherited.length > 0 && (
                <div style={{ fontSize: "12px", color: "#888" }}>
                  Inherited:{" "}
                  {permissions.inherited.map((p) => p.resource).join(", ")}
                </div>
              )}
            </div>
          ),
          key: role.id || role.name,
          children: [],
          permissions: role.permissions || [],
          parent_role: role.parent_role,
        });
      }
    });

    // Build the hierarchy
    const treeData = [];
    roleMap.forEach((node, roleName) => {
      const parentRole = node.parent_role;

      if (parentRole && roleMap.has(parentRole)) {
        // Add to parent's children if parent exists
        const parentNode = roleMap.get(parentRole);
        parentNode.children.push(node);
      } else {
        // Add to root level if no parent or parent doesn't exist
        treeData.push(node);
      }
    });

    // Sort the tree to ensure Admin > Manager > Employee order
    const roleOrder = ["Admin", "Manager", "Employee"];
    treeData.sort((a, b) => {
      const aIndex = roleOrder.indexOf(
        a.title.props.children[0].props.children
      );
      const bIndex = roleOrder.indexOf(
        b.title.props.children[0].props.children
      );
      return aIndex - bIndex;
    });

    return treeData;
  }, [roles, getRolePermissions]);

  // Add openEditMode function to correctly load existing role data
  const openEditMode = useCallback((role) => {
    setEditMode(true);
    setSelectedRole(role);
    setRoleName(role.name);
    setParentRole(role.parent_role || null);

    // Format permissions back to string format
    const permissionString = (role.permissions || [])
      .map((perm) => {
        if (typeof perm === "string") return perm;
        return `${perm.is_private ? "*" : ""}${perm.resource}`;
      })
      .join(", ");

    setPermissions(permissionString);
    setMutuallyExclusiveRoles(role.mutually_exclusive_roles?.join(", ") || "");
    setMaxMembers(role.max_members?.toString() || "");
  }, []);

  // Add function to fetch role permissions including inherited ones
  const fetchRolePermissions = useCallback(async (roleName) => {
    try {
      const response = await RoleService.getRolePermissions(roleName);
      setInheritedPermissions(response.permissions);
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
      message.error("Failed to fetch role permissions");
    }
  }, []);

  // Modify the columns definition to show private permissions
  const columns = [
    // ... other columns ...
    {
      title: "Permissions",
      key: "permissions",
      render: (_, record) => {
        const allPermissions = getRolePermissions(record.name);

        const formatPermissions = (perms, type) => {
          if (!perms || perms.length === 0) return null;

          const formatted = perms
            .map(
              (perm) => `${perm.resource}${perm.is_private ? " (private)" : ""}`
            )
            .join(", ");

          return (
            <div>
              <strong>{type}:</strong> {formatted}
            </div>
          );
        };

        return (
          <div>
            {formatPermissions(allPermissions.direct, "Direct")}
            {formatPermissions(allPermissions.inherited, "Inherited")}
          </div>
        );
      },
    },
  ];

  // Add helper text for permission input
  const PermissionInput = () => (
    <Form.Item
      label="Permissions"
      help="Use comma-separated values. Add * prefix for private permissions (e.g., *edit_personal_profile)"
    >
      <Input
        placeholder="e.g., read_document, *edit_personal_profile, write_document"
        value={permissions}
        onChange={(e) => setPermissions(e.target.value)}
      />
    </Form.Item>
  );

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
    inheritedPermissions,
    fetchRolePermissions,
    getRolePermissions,
  };
};
