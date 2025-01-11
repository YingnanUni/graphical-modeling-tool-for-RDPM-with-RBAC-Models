import axios from "axios";

const BASE_URL = "http://127.0.0.1:8000";

export class RoleService {
  // Get all roles
  static async getAllRoles() {
    try {
      const response = await axios.get(`${BASE_URL}/roles`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch roles:", error);
      throw error;
    }
  }

  // Get specific role by name
  static async getRole(roleName) {
    try {
      const response = await axios.get(`${BASE_URL}/get-data/roles`, {
        params: { name: roleName },
      });
      return response.data.data[0];
    } catch (error) {
      console.error("Failed to fetch role details:", error);
      throw error;
    }
  }

  // Create new role
  static async createRole(roleData) {
    try {
      const formattedData = {
        name: roleData.name,
        parent_role: roleData.parent_role || null,
        permissions: roleData.permissions.map((perm) => ({
          resource: perm.resource,
          actions: Array.isArray(perm.actions) ? perm.actions : [],
        })),
        mutually_exclusive_roles: roleData.mutually_exclusive_roles || [],
        max_members:
          roleData.max_members !== ""
            ? parseInt(roleData.max_members, 10)
            : null,
        inherit_child_permissions: roleData.inherit_child_permissions ?? true,
      };

      const response = await axios.post(`${BASE_URL}/roles`, formattedData);
      return response.data;
    } catch (error) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw error;
    }
  }

  // Update existing role
  static async updateRole(roleName, roleData) {
    try {
      const response = await axios.put(
        `${BASE_URL}/update-data/roles/${roleName}`,
        roleData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update role:", error);
      throw error;
    }
  }

  // Delete role
  static async deleteRole(roleName) {
    try {
      const response = await axios.delete(`${BASE_URL}/roles/${roleName}`);
      return response.data;
    } catch (error) {
      console.error("Failed to delete role:", error);
      throw error;
    }
  }

  // Get role hierarchy
  static async getRoleHierarchy() {
    try {
      const response = await axios.get(`${BASE_URL}/roles/hierarchy`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch role hierarchy:", error);
      throw error;
    }
  }

  // Get role permissions
  static async getRolePermissions(roleName) {
    try {
      const response = await axios.get(
        `${BASE_URL}/roles/${roleName}/permissions`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to fetch role permissions:", error);
      throw error;
    }
  }
}
