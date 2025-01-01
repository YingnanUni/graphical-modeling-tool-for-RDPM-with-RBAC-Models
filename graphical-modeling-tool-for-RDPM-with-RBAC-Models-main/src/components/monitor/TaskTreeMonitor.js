import React, { useEffect, useState } from "react";
import { Tree, Card, Typography, Tag, Empty, Spin } from "antd";
import { useSelector } from "react-redux";
import { selectRoles } from "../../store/roleSlice";
import { selectResources } from "../../store/resourceSlice";
import { selectRoleResources } from "../../store/roleResourceSlice";
import "../../styles/TaskTreeMonitor.css";
import { AuthorizationService } from "../../services/AuthorizationService";

const { Title, Text } = Typography;

const TaskTreeMonitor = ({ task, taskProperties }) => {
  const [treeData, setTreeData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allocationType, setAllocationType] = useState("1:1");

  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);
  const roleResources = useSelector(selectRoleResources);

  // 首先定义 getResourceStatusTag 函数
  const getResourceStatusTag = (resourceId) => {
    const isAvailable = AuthorizationService.isResourceAvailable(
      resourceId,
      task?.id,
      taskProperties
    );

    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return <Tag color="error">Resource Not Found</Tag>;

    if (resource.isShared) {
      const currentShares = AuthorizationService.countResourceShares(
        resourceId,
        taskProperties
      );
      const maxShares = resource.maxShares || 1;
      return (
        <Tag color={currentShares >= maxShares ? "red" : "blue"}>
          Shared ({currentShares}/{maxShares})
        </Tag>
      );
    }

    const currentTask = taskProperties[task?.id];
    const isCurrentTaskResource =
      currentTask &&
      (currentTask.resourceId === resourceId ||
        (currentTask.roleResources &&
          Object.values(currentTask.roleResources).some((resources) =>
            resources.includes(resourceId)
          )));

    return (
      <Tag
        color={isCurrentTaskResource ? "green" : isAvailable ? "blue" : "red"}
      >
        {isCurrentTaskResource
          ? "Assigned"
          : isAvailable
          ? "Available"
          : "Occupied"}
      </Tag>
    );
  };

  // 然后定义 updateTreeData 函数
  const updateTreeData = (taskData) => {
    if (!taskData) return;
    setIsLoading(true);

    try {
      if (!roles || !resources) {
        console.warn("Roles or resources data not available");
        return;
      }

      // 确保使用最新的分配类型
      const currentAllocationType = taskData.allocationType || allocationType;
      setAllocationType(currentAllocationType);

      const newTreeData = [
        {
          key: taskData.id || "task",
          title: (
            <div
              style={{
                fontWeight: "bold",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span>{taskData.name || "Unnamed Task"}</span>
              <Tag color="purple">{`Allocation: ${allocationType}`}</Tag>
            </div>
          ),
          children: [],
        },
      ];

      if (allocationType === "n:n" && taskData.roleResources) {
        const assignedRoleIds = Array.isArray(taskData.roleId)
          ? taskData.roleId
          : [];
        const assignedRoles = roles.filter((role) =>
          assignedRoleIds.includes(role.id)
        );

        assignedRoles.forEach((role) => {
          const roleResources = taskData.roleResources[role.id] || [];
          const roleNode = {
            key: `role-${role.id}`,
            title: (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{role.name}</span>
                <Tag color="blue">Role</Tag>
              </div>
            ),
            children: roleResources
              .map((resourceId) => {
                const resource = resources.find((r) => r.id === resourceId);
                if (!resource) {
                  console.warn(`Resource not found: ${resourceId}`);
                  return null;
                }
                return {
                  key: `resource-${role.id}-${resourceId}`,
                  title: (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{resource.name}</span>
                      {getResourceStatusTag(resourceId)}
                    </div>
                  ),
                };
              })
              .filter(Boolean), // 过滤掉 null 值
          };
          newTreeData[0].children.push(roleNode);
        });
      } else {
        const role = roles.find((r) => r.id === taskData.roleId);
        if (!role) {
          console.warn(`Role not found: ${taskData.roleId}`);
          return;
        }

        const roleNode = {
          key: `role-${taskData.roleId}`,
          title: (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>{role.name}</span>
              <Tag color="blue">Role</Tag>
            </div>
          ),
          children: [],
        };

        if (allocationType === "1:1" && taskData.resourceId) {
          const resource = resources.find((r) => r.id === taskData.resourceId);
          if (resource) {
            roleNode.children.push({
              key: `resource-${taskData.resourceId}`,
              title: (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>{resource.name}</span>
                  {getResourceStatusTag(taskData.resourceId)}
                </div>
              ),
            });
          }
        } else if (
          allocationType === "1:n" &&
          Array.isArray(taskData.resourceId)
        ) {
          taskData.resourceId.forEach((resourceId) => {
            const resource = resources.find((r) => r.id === resourceId);
            if (resource) {
              roleNode.children.push({
                key: `resource-${resourceId}`,
                title: (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{resource.name}</span>
                    {getResourceStatusTag(resourceId)}
                  </div>
                ),
              });
            }
          });
        }

        newTreeData[0].children.push(roleNode);
      }

      setTreeData(newTreeData);
    } catch (error) {
      console.error("Error updating tree data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // 最后定义 useEffect
  useEffect(() => {
    if (task && taskProperties) {
      const currentTask = taskProperties[task.id];
      if (currentTask) {
        setAllocationType(currentTask.allocationType || "1:1");
        updateTreeData(currentTask);
      }
    }
  }, [task, taskProperties, roles, resources, roleResources]);

  useEffect(() => {
    const handleResourceUpdate = (event) => {
      const { taskId, allocation } = event.detail;
      if (taskId === task?.id) {
        // 更新分配类型
        setAllocationType(allocation.allocationType || "1:1");

        // 使用完整的任务数据更新树
        const updatedTaskData = {
          ...taskProperties[taskId],
          ...allocation,
          id: taskId,
        };
        updateTreeData(updatedTaskData);
      }
    };

    document.addEventListener("resourceAllocationUpdate", handleResourceUpdate);

    return () => {
      document.removeEventListener(
        "resourceAllocationUpdate",
        handleResourceUpdate
      );
    };
  }, [task, taskProperties, updateTreeData]);

  if (isLoading) {
    return (
      <div className="tree-monitor-loading">
        <Spin size="large" />
        <Text>Loading resource allocation data...</Text>
      </div>
    );
  }

  return (
    <Card title="Resource Allocation Monitor" className="resource-monitor-card">
      {task ? (
        treeData.length > 0 ? (
          <div className="tree-monitor-content">
            <Tree
              treeData={treeData}
              defaultExpandAll
              showLine
              showIcon={false}
              className="resource-tree"
            />
          </div>
        ) : (
          <Empty description="No resources allocated to this task" />
        )
      ) : (
        <Empty description="No task selected" />
      )}
    </Card>
  );
};

export default TaskTreeMonitor;
