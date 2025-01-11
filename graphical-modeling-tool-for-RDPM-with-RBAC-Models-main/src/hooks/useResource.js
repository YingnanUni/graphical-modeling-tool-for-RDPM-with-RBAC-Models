// hooks/useResource.js
import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addResource,
  deleteResource,
  selectResources,
  updateResource,
  updateResourceStatus,
} from "../store/resourceSlice";
import { assignResourceToRole } from "../store/roleResourceSlice";
import { selectRoles } from "../store/roleSlice";
import { selectPatterns } from "../store/patternSlice";
import { message } from "antd";
import { Badge, Button, Space } from "antd";
import { ResourceService } from "../services/ResourceService";

export const useResource = () => {
  const dispatch = useDispatch();
  const resources = useSelector(selectResources) || [];

  const handleAddResource = useCallback(
    async (newResource) => {
      try {
        const response = await ResourceService.createResource(newResource);
        dispatch(addResource(response.data));
      } catch (error) {
        message.error("Failed to add resource");
      }
    },
    [dispatch]
  );

  const handleDeleteResource = useCallback(
    async (name) => {
      try {
        await ResourceService.deleteResource(name);
        dispatch(deleteResource(name));
      } catch (error) {
        message.error("Failed to delete resource");
      }
    },
    [dispatch]
  );

  const handleStatusChange = useCallback(
    async (name, newStatus) => {
      try {
        await ResourceService.toggleResourceStatus(name);
        dispatch(updateResourceStatus({ name, status: newStatus }));
      } catch (error) {
        message.error("Failed to update status");
      }
    },
    [dispatch]
  );

  return {
    resources: Array.isArray(resources) ? resources : [],
    handleAddResource,
    handleDeleteResource,
    handleStatusChange,
  };
};
