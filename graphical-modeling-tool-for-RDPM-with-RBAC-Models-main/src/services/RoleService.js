import axios from "axios";

const BASE_URL = "/api";

export class RoleService {
  // Get all roles
  static async getAllRoles() {
    try {
      const response = await axios.get(`${BASE_URL}/get-data/roles`);
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
      const response = await axios.post(`${BASE_URL}/add-data/roles`, roleData);
      return response.data;
    } catch (error) {
      console.error("Failed to create role:", error);
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
      const response = await axios.delete(
        `${BASE_URL}/delete-data/roles/${roleName}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to delete role:", error);
      throw error;
    }
  }
}
