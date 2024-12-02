// RoleService.js

let roles = [];
let rolePermissions = {};
let roleConstraints = {};

export const addOrUpdateRole = (
  newRole,
  permissions = [],
  constraints = {}
) => {
  const roleIndex = roles.findIndex((role) => role.name === newRole.name);
  if (roleIndex !== -1) {
    roles[roleIndex] = newRole;
  } else {
    roles.push(newRole);
  }
  rolePermissions[newRole.name] = permissions;
  roleConstraints[newRole.name] = constraints;
};

export const deleteRole = (roleName) => {
  roles = roles.filter((role) => role.name !== roleName);
  delete rolePermissions[roleName];
  delete roleConstraints[roleName];
};

export const getRoleHierarchy = () => {
  const roleMap = {};
  const hierarchy = [];

  roles.forEach((role) => {
    roleMap[role.name] = { title: role.name, key: role.name, children: [] };
  });

  roles.forEach((role) => {
    if (role.parent && roleMap[role.parent]) {
      roleMap[role.parent].children.push(roleMap[role.name]);
    } else {
      hierarchy.push(roleMap[role.name]);
    }
  });

  return hierarchy;
};

export const getRoles = () => roles || [];

export const getRolePermissions = () => rolePermissions;

export const getRoleConstraints = () => roleConstraints;
