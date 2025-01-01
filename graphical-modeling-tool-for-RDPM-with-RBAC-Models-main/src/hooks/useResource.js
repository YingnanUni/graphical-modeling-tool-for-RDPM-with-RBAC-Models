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

export const useResource = () => {
  const dispatch = useDispatch();
  const resources = useSelector(selectResources) || [];

  const handleAddResource = useCallback(
    (newResource) => {
      dispatch(addResource(newResource));
    },
    [dispatch]
  );

  const handleDeleteResource = useCallback(
    (id) => {
      dispatch(deleteResource(id));
    },
    [dispatch]
  );

  const handleStatusChange = useCallback(
    (id, newStatus) => {
      dispatch(updateResourceStatus({ id, status: newStatus }));
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
