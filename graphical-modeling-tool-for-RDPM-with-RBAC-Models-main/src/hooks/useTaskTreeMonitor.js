import { useMemo, useEffect, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { Tag } from "antd";
import { selectResources } from "../store/resourceSlice";
import { selectRoles } from "../store/roleSlice";
import { selectRoleResources } from "../store/roleResourceSlice";

export const useTaskTreeMonitor = (task, taskProperties) => {
  const resources = useSelector(selectResources) || [];
  const roles = useSelector(selectRoles) || [];
  const roleResources = useSelector(selectRoleResources) || {};

  // 添加本地状态来跟踪资源加载状态
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [loadedResourceData, setLoadedResourceData] = useState(null);

  // 添加资源共享状态的处理
  const getResourceShareStatus = useMemo(() => {
    if (!resources || !roleResources) return {};

    const shareStatus = {};
    resources.forEach((resource) => {
      const assignedRoles = Object.entries(roleResources)
        .filter(([_, resIds]) => resIds.includes(resource.id))
        .map(([roleId]) => roleId);

      shareStatus[resource.id] = {
        isShared: resource.isShared || false,
        maxShares: resource.maxShares || 1,
        currentShares: assignedRoles.length,
        assignedRoles,
      };
    });

    return shareStatus;
  }, [resources, roleResources]);

  // 添加资源可用性检查
  const getAvailableResources = useMemo(() => {
    if (!resources || !roleResources) return [];

    // Get all assigned resource IDs and their allocation details
    const resourceAllocations = new Map();
    Object.values(taskProperties || {}).forEach((taskData) => {
      if (taskData.resourceId) {
        const resourceId = taskData.resourceId;
        if (!resourceAllocations.has(resourceId)) {
          resourceAllocations.set(resourceId, {
            count: 0,
            tasks: new Set(),
          });
        }
        resourceAllocations.get(resourceId).count++;
        resourceAllocations.get(resourceId).tasks.add(taskData.id);
      }
    });

    // Filter available resources
    return resources.filter((resource) => {
      // If resource is shared, check against maxShares
      if (resource.isShared) {
        const allocation = resourceAllocations.get(resource.id);
        const currentShares = allocation ? allocation.count : 0;
        return currentShares < (resource.maxShares || 1);
      }

      // If resource is not shared, check if it's already allocated
      const allocation = resourceAllocations.get(resource.id);
      if (!allocation) return true; // Resource not allocated anywhere

      // Allow resource to be used by current task even if allocated
      if (task && allocation.tasks.has(task.id)) return true;

      return false; // Resource is allocated to other tasks
    });
  }, [resources, roleResources, taskProperties, task]);

  // 构建树形数据结构
  const treeData = useMemo(() => {
    if (!task || !taskProperties) return [];

    const taskData = taskProperties[task.id] || {};
    const role = roles.find((r) => r.id === taskData.roleId);
    const directResource = resources.find((r) => r.id === taskData.resourceId);

    const children = [];

    // 添加角色节点
    if (role) {
      const roleBasedResources = getAvailableResources.filter((resource) =>
        roleResources[role.id]?.includes(resource.id)
      );

      children.push({
        key: `role-${role.id}`,
        title: (
          <div>
            <span style={{ marginRight: "8px" }}>Role: {role.name}</span>
            <Tag color="blue">Role</Tag>
          </div>
        ),
        children: roleBasedResources.map((resource) => ({
          key: `resource-${resource.id}`,
          title: (
            <div>
              <span style={{ marginRight: "8px" }}>{resource.name}</span>
              {getResourceStatusTag(resource)}
            </div>
          ),
        })),
      });
    }

    // 如果有直接分配的资源，显示在树中
    if (directResource) {
      children.push({
        key: `direct-resource-${directResource.id}`,
        title: (
          <div>
            <span style={{ marginRight: "8px" }}>{directResource.name}</span>
            {getResourceStatusTag(directResource)}
            <Tag color="orange">Direct Assignment</Tag>
          </div>
        ),
      });
    }

    return [
      {
        key: task.id,
        title: (
          <div style={{ fontWeight: "bold" }}>
            {taskData.name || task.businessObject?.name || "Unnamed Task"}
          </div>
        ),
        children,
      },
    ];
  }, [
    task,
    taskProperties,
    roles,
    resources,
    roleResources,
    getAvailableResources,
  ]);

  // 监听资源分配更新事件
  useEffect(() => {
    const handleResourceUpdate = (event) => {
      setLoadedResourceData(event.detail);
    };

    document.addEventListener("resourceAllocationUpdate", handleResourceUpdate);
    return () => {
      document.removeEventListener(
        "resourceAllocationUpdate",
        handleResourceUpdate
      );
    };
  }, []);

  return {
    treeData,
    isLoading: !resources || !roles || isLoadingResources,
  };
};
