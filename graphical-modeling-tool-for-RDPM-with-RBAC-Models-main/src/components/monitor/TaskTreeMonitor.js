import React, { useEffect, useState, useCallback } from "react";
import { Tree, Card, Typography, Tag, Empty, Spin } from "antd";
import { useSelector } from "react-redux";
import { selectRoles } from "../../store/roleSlice";
import { selectResources } from "../../store/resourceSlice";
import { selectRoleResources } from "../../store/roleResourceSlice";
import "../../styles/TaskTreeMonitor.css";

const { Text } = Typography;

const TaskTreeMonitor = ({ task, taskProperties }) => {
  const [treeData, setTreeData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allocationType, setAllocationType] = useState("1:1");
  const [selectedTask, setSelectedTask] = useState(null);

  const roles = useSelector(selectRoles);
  const resources = useSelector(selectResources);
  const roleResources = useSelector(selectRoleResources);

  const getResourceStatusTag = (resourceId) => {
    const resource = resources.find((r) => r.id === resourceId);
    if (!resource) return <Tag color="error">Resource Not Found</Tag>;

    const currentTask = selectedTask ? taskProperties[selectedTask.id] : null;
    const isCurrentTaskResource =
      currentTask &&
      (currentTask.resourceId === resourceId ||
        (currentTask.roleResources &&
          Object.values(currentTask.roleResources).some((resources) =>
            resources.includes(resourceId)
          )));

    const isUsedByOtherTasks = Object.entries(taskProperties).some(
      ([taskId, task]) => {
        if (taskId === selectedTask?.id) return false;
        return (
          task.resourceId === resourceId ||
          (task.roleResources &&
            Object.values(task.roleResources).some((resources) =>
              resources.includes(resourceId)
            ))
        );
      }
    );

    if (resource.isShared) {
      const currentShares = Object.values(taskProperties).filter(
        (task) =>
          task.resourceId === resourceId ||
          (task.roleResources &&
            Object.values(task.roleResources).some((resources) =>
              resources.includes(resourceId)
            ))
      ).length;

      return (
        <Tag
          color={currentShares >= (resource.maxShares || 1) ? "red" : "blue"}
        >
          Shared ({currentShares}/{resource.maxShares || 1})
        </Tag>
      );
    }

    if (isCurrentTaskResource) {
      return <Tag color="green">Assigned</Tag>;
    }

    return (
      <Tag color={isUsedByOtherTasks ? "red" : "green"}>
        {isUsedByOtherTasks ? "Occupied" : "Available"}
      </Tag>
    );
  };

  const updateTreeData = useCallback(
    (taskData) => {
      if (!taskData) return;
      setIsLoading(true);

      try {
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
                <Tag color="purple">{`Allocation: ${
                  taskData.allocationType || allocationType
                }`}</Tag>
              </div>
            ),
            children: [],
          },
        ];

        if (taskData.allocationType === "n:n" && taskData.roleId) {
          const assignedRoleIds = Array.isArray(taskData.roleId)
            ? taskData.roleId
            : [taskData.roleId];
          assignedRoleIds.forEach((roleId) => {
            const role = roles.find((r) => r.id === roleId);
            if (role) {
              const roleNode = {
                key: `role-${roleId}`,
                title: (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>{role.name}</span>
                    <Tag color="blue">Role</Tag>
                  </div>
                ),
                children: [],
              };

              const roleResources = resources.filter((resource) => {
                if (Array.isArray(taskData.resourceId)) {
                  return taskData.resourceId.includes(resource.id);
                }
                return resource.id === taskData.resourceId;
              });

              roleResources.forEach((resource) => {
                roleNode.children.push({
                  key: `resource-${roleId}-${resource.id}`,
                  title: (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>{resource.name}</span>
                      {getResourceStatusTag(resource.id)}
                    </div>
                  ),
                });
              });

              newTreeData[0].children.push(roleNode);
            }
          });
        } else {
          const role = roles.find((r) => r.id === taskData.roleId);
          if (role) {
            const roleNode = {
              key: `role-${role.id}`,
              title: (
                <div
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <span>{role.name}</span>
                  <Tag color="blue">Role</Tag>
                </div>
              ),
              children: [],
            };

            // 添加资源
            const resourceIds = Array.isArray(taskData.resourceId)
              ? taskData.resourceId
              : [taskData.resourceId];

            resourceIds.forEach((resourceId) => {
              const resource = resources.find((r) => r.id === resourceId);
              if (resource) {
                roleNode.children.push({
                  key: `resource-${resourceId}`,
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
                });
              }
            });

            newTreeData[0].children.push(roleNode);
          }
        }

        setTreeData(newTreeData);
      } catch (error) {
        console.error("Error updating tree data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [roles, resources, allocationType]
  );

  useEffect(() => {
    const handleTaskSelected = (event) => {
      const { task, taskData } = event.detail;
      setSelectedTask(task);
      if (task && taskProperties[task.id]) {
        updateTreeData(taskProperties[task.id]);
      }
    };

    document.addEventListener("taskSelected", handleTaskSelected);
    return () => {
      document.removeEventListener("taskSelected", handleTaskSelected);
    };
  }, [taskProperties, updateTreeData]);

  useEffect(() => {
    const handleResourceUpdate = (event) => {
      const { taskId, taskData } = event.detail;
      if (taskId && taskData) {
        updateTreeData(taskData);
      }
    };

    document.addEventListener("resourceAllocationUpdate", handleResourceUpdate);
    return () => {
      document.removeEventListener(
        "resourceAllocationUpdate",
        handleResourceUpdate
      );
    };
  }, [updateTreeData]);

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
      {selectedTask ? (
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
