import React, { useMemo } from "react";
import { Table, Button, Space } from "antd";

const TaskChainPreview = ({
  taskProperties,
  roles,
  resources,
  onTaskStatusChange,
}) => {
  // Transform task properties into table data format
  const dataSource = useMemo(
    () =>
      Object.entries(taskProperties).map(([id, task]) => ({
        key: id,
        taskName: task.name || "Unnamed Task",
        role: roles.find((r) => r.id === task.roleId)?.name || "Unspecified",
        resource:
          resources.find((r) => r.id === task.resourceId)?.name ||
          "Unspecified",
        triggerCondition: task.triggerCondition || "None",
        nextTask: taskProperties[task.nextTaskId]?.name || "None",
        taskRelation: task.taskRelation || "Sequential",
        status: task.status || "pending",
      })),
    [taskProperties, roles, resources]
  );

  // Define table columns
  const columns = [
    {
      title: "Task Name",
      dataIndex: "taskName",
      key: "taskName",
    },
    {
      title: "Role",
      dataIndex: "role",
      key: "role",
    },
    {
      title: "Resource",
      dataIndex: "resource",
      key: "resource",
    },
    {
      title: "Trigger Condition",
      dataIndex: "triggerCondition",
      key: "triggerCondition",
    },
    {
      title: "Next Task",
      dataIndex: "nextTask",
      key: "nextTask",
    },
    {
      title: "Task Relationship",
      dataIndex: "taskRelation",
      key: "taskRelation",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() =>
              onTaskStatusChange(
                record.key,
                record.status === "pending"
                  ? "in-progress"
                  : record.status === "in-progress"
                  ? "completed"
                  : "pending"
              )
            }
          >
            {record.status === "pending"
              ? "Start"
              : record.status === "in-progress"
              ? "Complete"
              : "Reset"}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      dataSource={dataSource}
      columns={columns}
      pagination={false}
      size="small"
    />
  );
};

export default TaskChainPreview;
