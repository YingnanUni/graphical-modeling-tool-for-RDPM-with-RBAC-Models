// hooks/useRoleResource.js
import { useState, useCallback, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectRoles } from "../store/roleSlice";
import { selectResources } from "../store/resourceSlice";
import { message } from "antd";

export const useRoleResource = () => {
  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);

  const [roleResources, setRoleResources] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedResource, setSelectedResource] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [editingRole, setEditingRole] = useState(null);

  useEffect(() => {
    if (Object.keys(roleResources).length > 0) {
      const newDataSource = roles
        .filter((role) => roleResources[role.name])
        .map((role) => ({
          role: role.name,
          resources: roleResources[role.name] || [],
        }));
      setDataSource(newDataSource);
    } else {
      setDataSource([]);
    }
  }, [roles, roleResources]);

  const assignResource = useCallback(() => {
    if (!selectedRole || !selectedResource) {
      message.error("Please select roles and resources");
      return;
    }

    setRoleResources((prev) => {
      const updatedResources = editingRole
        ? [selectedResource]
        : prev[selectedRole]
        ? [...new Set([...prev[selectedRole], selectedResource])]
        : [selectedResource];

      return { ...prev, [selectedRole]: updatedResources };
    });

    message.success(
      `Success${
        editingRole ? "Modified" : "Assigned"
      }Resources "${selectedResource}" ${
        editingRole ? "give" : "to"
      }role "${selectedRole}"`
    );

    setSelectedResource(null);
    setEditingRole(null);
    setSelectedRole(null);
  }, [selectedRole, selectedResource, editingRole]);

  const startEditing = useCallback(
    (role) => {
      setEditingRole(role);
      setSelectedRole(role);
      if (roleResources[role] && roleResources[role].length > 0) {
        setSelectedResource(roleResources[role][0]);
      }
      message.info(`Modifying resources "${role}" for the role`);
    },
    [roleResources]
  );

  const handleBatchDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning("Please select the roles to be deleted first");
      return;
    }

    setRoleResources({});
    setSelectedRows([]);
    setSelectedRole(null);
    setSelectedResource(null);
    setEditingRole(null);
    setDataSource([]);

    message.success("Successful deletion of all resource assignments");
  }, [selectedRows.length]);

  const buildRoleTree = useCallback(() => {
    const roleMap = roles.reduce((map, role) => {
      if (role?.name) {
        map[role.name] = {
          title: `${role.name} (resource: ${
            roleResources[role.name]?.join(", ") || "None"
          })`,
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
  }, [roles, roleResources]);

  return {
    roles,
    resources,
    roleResources,
    selectedRole,
    selectedResource,
    selectedRows,
    dataSource,
    editingRole,

    setSelectedRole,
    setSelectedResource,
    setSelectedRows,
    setRoleResources,
    setEditingRole,

    assignResource,
    startEditing,
    handleBatchDelete,
    buildRoleTree,
  };
};
