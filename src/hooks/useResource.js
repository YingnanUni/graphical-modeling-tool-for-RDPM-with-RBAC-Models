// hooks/useResource.js
import { useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addResource,
  deleteResource,
  selectResources,
  updateResource,
} from "../store/resourceSlice";
import { selectRoles } from "../store/roleSlice";
import { selectPatterns } from "../store/patternSlice";
import { message } from "antd";

export const useResource = () => {
  const dispatch = useDispatch();
  const resources = useSelector(selectResources);
  const roles = useSelector(selectRoles);
  const patterns = useSelector(selectPatterns);

  const [resourceName, setResourceName] = useState("");
  const [relatedRole, setRelatedRole] = useState("");
  const [changePattern, setChangePattern] = useState("");
  const [selectedRows, setSelectedRows] = useState([]);

  const resetForm = useCallback(() => {
    setResourceName("");
    setRelatedRole("");
    setChangePattern("");
  }, []);

  const handleAddResource = useCallback(() => {
    if (!resourceName || !relatedRole || !changePattern) {
      message.error("Please fill in the complete resource information");
      return;
    }

    const newResource = {
      id: Date.now().toString(),
      name: resourceName,
      relatedRole,
      changePattern,
    };

    dispatch(addResource(newResource));
    message.success("Resource added successfully");
    resetForm();
  }, [resourceName, relatedRole, changePattern, dispatch, resetForm]);

  // 删除单个资源
  const handleDeleteResource = useCallback(
    (resourceName) => {
      dispatch(deleteResource(resourceName));
      message.success("Resource deleted successfully");
    },
    [dispatch]
  );

  // 批量删除资源
  const handleBatchDelete = useCallback(() => {
    if (selectedRows.length === 0) {
      message.warning("Please select the resources to be deleted first");
      return;
    }

    selectedRows.forEach((resource) => {
      dispatch(deleteResource(resource.name));
    });

    message.success(`Successfully deleted${selectedRows.length}resources`);
    setSelectedRows([]);
  }, [selectedRows, dispatch]);

  const handlePatternChange = useCallback(
    (resourceId, patternId) => {
      dispatch(
        updateResource({
          id: resourceId,
          changes: { patternId },
        })
      );
    },
    [dispatch]
  );

  const columns = [
    {
      title: "Resource name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Related Roles",
      dataIndex: "relatedRole",
      key: "relatedRole",
    },
    {
      title: "Change patterns",
      dataIndex: "changePattern",
      key: "changePattern",
    },
  ];

  return {
    resources,
    roles,
    resourceName,
    relatedRole,
    changePattern,
    columns,
    selectedRows,
    patterns,

    setResourceName,
    setRelatedRole,
    setChangePattern,
    setSelectedRows,

    handleAddResource,
    handleDeleteResource,
    handleBatchDelete,
    resetForm,
    handlePatternChange,
  };
};
