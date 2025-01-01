import React, {
  useMemo,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Table, Button, Space, Tooltip, Badge } from "antd";

const TaskChainPreview = forwardRef(
  ({ taskProperties, roles, resources, onTaskStatusChange }, ref) => {
    const [localTasks, setLocalTasks] = useState(taskProperties);

    useImperativeHandle(ref, () => ({
      updateTasks: (newTasks) => {
        setLocalTasks(newTasks);
      },
    }));

    // Listen for BPMN updates
    useEffect(() => {
      const handleBpmnUpdate = (event) => {
        const { allTasks } = event.detail;
        setLocalTasks(allTasks);
      };

      document.addEventListener("bpmnTaskUpdate", handleBpmnUpdate);
      return () => {
        document.removeEventListener("bpmnTaskUpdate", handleBpmnUpdate);
      };
    }, []);

    // Sync with external taskProperties
    useEffect(() => {
      setLocalTasks(taskProperties);
    }, [taskProperties]);

    // Status badge configuration
    const getStatusBadge = (status) => {
      const statusConfig = {
        pending: { status: "default", text: "Pending" },
        "in-progress": { status: "processing", text: "In Progress" },
        completed: { status: "success", text: "Completed" },
        failed: { status: "error", text: "Failed" },
      };
      const config = statusConfig[status] || statusConfig.pending;
      return <Badge status={config.status} text={config.text} />;
    };

    // Table columns configuration
    const columns = [
      {
        title: "Task Name",
        dataIndex: "taskName",
        key: "taskName",
        width: "30%",
        render: (text, record) => (
          <Tooltip
            title={
              <div>
                <p>Role: {record.role || "Unspecified"}</p>
                <p>Resource: {record.resource || "Unspecified"}</p>
              </div>
            }
          >
            <span>{text}</span>
          </Tooltip>
        ),
      },
      {
        title: "Status",
        dataIndex: "status",
        key: "status",
        width: "30%",
        render: (status) => getStatusBadge(status),
      },
      {
        title: "Actions",
        key: "actions",
        width: "40%",
        render: (_, record) => (
          <Space>
            {/* Action buttons based on task status */}
            {record.status === "pending" && (
              <Button
                size="small"
                type="primary"
                onClick={() => onTaskStatusChange(record.key, "in-progress")}
              >
                Start
              </Button>
            )}
            {record.status === "in-progress" && (
              <Space>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => onTaskStatusChange(record.key, "completed")}
                >
                  Complete
                </Button>
                <Button
                  size="small"
                  danger
                  onClick={() => onTaskStatusChange(record.key, "failed")}
                >
                  Fail
                </Button>
              </Space>
            )}
            {(record.status === "completed" || record.status === "failed") && (
              <Button
                size="small"
                onClick={() => onTaskStatusChange(record.key, "pending")}
              >
                Reset
              </Button>
            )}
          </Space>
        ),
      },
    ];

    // Transform task properties into table data format
    const dataSource = useMemo(
      () =>
        Object.entries(localTasks).map(([id, task]) => ({
          key: id,
          taskName: task.name || "Unnamed Task",
          status: task.status || "pending",
          role: roles.find((r) => r.id === task.roleId)?.name,
          resource: resources.find((r) => r.id === task.resourceId)?.name,
        })),
      [localTasks, roles, resources]
    );

    // 添加刷新功能
    const handleRefresh = useCallback(() => {
      console.log("刷新任务链:", taskProperties);
      setLocalTasks(taskProperties);
    }, [taskProperties]);

    return (
      <div>
        {/* 添加刷新按钮 */}
        <Button
          onClick={handleRefresh}
          style={{ marginBottom: "10px" }}
          type="primary"
        >
          刷新任务链
        </Button>

        <Table
          dataSource={dataSource}
          columns={columns}
          pagination={false}
          size="small"
          className="real-time-task-chain"
        />
      </div>
    );
  }
);

export default TaskChainPreview;
