import axios from "axios";

const BASE_URL = "/api";

export class ResourceService {
  // Get all resources
  static async getAllResources() {
    try {
      const response = await axios.get(`${BASE_URL}/get-data/resources`);
      return response.data.data;
    } catch (error) {
      console.error("Failed to fetch resources:", error);
      throw error;
    }
  }

  // Get specific resource by name
  static async getResource(resourceName) {
    try {
      const response = await axios.get(`${BASE_URL}/get-data/resources`, {
        params: { name: resourceName },
      });
      return response.data.data[0];
    } catch (error) {
      console.error("Failed to fetch resource details:", error);
      throw error;
    }
  }

  // Create new resource
  static async createResource(resourceData) {
    try {
      const response = await axios.post(
        `${BASE_URL}/add-data/resources`,
        resourceData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to create resource:", error);
      throw error;
    }
  }

  // Update existing resource
  static async updateResource(resourceName, resourceData) {
    try {
      const response = await axios.put(
        `${BASE_URL}/update-data/resources/${resourceName}`,
        resourceData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to update resource:", error);
      throw error;
    }
  }

  // Delete resource
  static async deleteResource(resourceName) {
    try {
      const response = await axios.delete(
        `${BASE_URL}/delete-data/resources/${resourceName}`
      );
      return response.data;
    } catch (error) {
      console.error("Failed to delete resource:", error);
      throw error;
    }
  }
}
