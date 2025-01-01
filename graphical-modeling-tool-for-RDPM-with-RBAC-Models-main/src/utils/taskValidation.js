/**
 * Validates task operations and resources
 */

/**
 * Validates a task operation (add/update/delete)
 * @param {string} operation - Operation type
 * @param {Object} taskData - Task data
 * @param {Object} existingTasks - Existing tasks
 * @returns {Object} Validation result
 */
export const validateTaskOperation = (operation, taskData, existingTasks) => {
  switch (operation) {
    case "add":
      // Validate new task
      if (!taskData.name?.trim()) {
        return { isValid: false, message: "Task name is required" };
      }
      break;

    case "delete":
      // Check if task can be safely deleted
      const dependentTasks = Object.values(existingTasks).filter(
        (task) => task.nextTaskId === taskData.id
      );
      if (dependentTasks.length > 1) {
        return {
          isValid: false,
          message: "Cannot delete task with multiple dependencies",
        };
      }
      break;

    case "update":
      // Validate task updates
      if (taskData.nextTaskId === taskData.id) {
        return {
          isValid: false,
          message: "Task cannot reference itself",
        };
      }
      break;

    default:
      // Default case
      break;
  }

  return { isValid: true };
};

/**
 * Validates resource assignments for a task
 * @param {Array} resources - Assigned resources
 * @param {Array} availableResources - All available resources
 * @returns {Object} Validation result
 */
export const validateTaskResources = (resources, availableResources) => {
  if (!resources || resources.length === 0) {
    return { isValid: false, message: "At least one resource required" };
  }

  // Check for resource conflicts
  const conflicts = resources.filter((resId) => {
    const resource = availableResources.find((r) => r.id === resId);
    return resource?.status === "Occupied";
  });

  if (conflicts.length > 0) {
    return {
      isValid: false,
      message: "Some selected resources are occupied",
    };
  }

  return { isValid: true };
};

/**
 * Validates task chain logic including conditional branches
 * @param {Object} tasks - Task collection
 * @returns {Object} Validation result
 */
export const validateTaskChainLogic = (tasks) => {
  // Check for circular dependencies
  const visited = new Set();
  const visiting = new Set();

  const hasCycle = (taskId, path = new Set()) => {
    if (visiting.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visiting.add(taskId);
    path.add(taskId);

    const task = tasks[taskId];
    const nextTasks = Array.isArray(task.nextTasks)
      ? task.nextTasks
      : [task.nextTaskId].filter(Boolean);

    for (const nextId of nextTasks) {
      if (path.has(nextId) || hasCycle(nextId, new Set(path))) {
        return true;
      }
    }

    visiting.delete(taskId);
    visited.add(taskId);
    return false;
  };

  // Validate each task
  for (const taskId in tasks) {
    if (hasCycle(taskId)) {
      return {
        isValid: false,
        message: "Circular dependency detected",
      };
    }
  }

  return { isValid: true };
};

/**
 * Validates task properties before updating
 * @param {Object} properties - Task properties to validate
 * @param {Object} existingTasks - Current tasks in the system
 * @returns {Object} Validation result with isValid flag and message
 */
export const validateTaskProperties = (properties, existingTasks) => {
  // Validate basic required fields
  if (!properties.name?.trim()) {
    return { isValid: false, message: "Task name is required" };
  }

  if (!properties.roleId) {
    return { isValid: false, message: "Role selection is required" };
  }

  if (!properties.resourceId) {
    return { isValid: false, message: "Resource selection is required" };
  }

  // Validate conditional execution
  if (properties.executionType === "conditional") {
    if (
      !properties.triggerCondition ||
      properties.triggerCondition.length === 0
    ) {
      return {
        isValid: false,
        message: "Trigger conditions are required for conditional execution",
      };
    }
  }

  // Validate custom condition if selected
  if (
    properties.triggerCondition?.includes("custom") &&
    !properties.customCondition?.trim()
  ) {
    return {
      isValid: false,
      message: "Custom condition is required when custom trigger is selected",
    };
  }

  return { isValid: true };
};

/**
 * Validates next task selection to prevent circular dependencies
 * @param {string} currentTaskId - Current task ID
 * @param {string} nextTaskId - Selected next task ID
 * @param {Object} taskProperties - All tasks in the system
 * @returns {boolean} - Whether the selection is valid
 */
export const validateNextTaskSelection = (
  currentTaskId,
  nextTaskId,
  taskProperties
) => {
  // Check for direct circular reference
  if (currentTaskId === nextTaskId) return false;

  // Check for indirect circular reference
  let checkedTasks = new Set([currentTaskId]);
  let taskToCheck = nextTaskId;

  while (taskToCheck) {
    if (checkedTasks.has(taskToCheck)) {
      return false; // Circular dependency found
    }
    checkedTasks.add(taskToCheck);
    taskToCheck = taskProperties[taskToCheck]?.nextTaskId;
  }

  return true;
};

/**
 * Validates if all trigger conditions for a task are met
 * @param {Object} task - The task to validate
 * @param {Object} allTasks - All tasks in the system
 * @param {Object} resourceStatus - Current status of all resources
 * @returns {Promise<boolean>} - Whether all conditions are met
 */
export const validateTriggerConditions = async (
  task,
  allTasks,
  resourceStatus
) => {
  if (!task.triggerConditions || task.triggerConditions.length === 0) {
    return true; // No conditions to check
  }

  try {
    const results = await Promise.all(
      task.triggerConditions.map(async (condition) => {
        switch (condition) {
          case "resourceAvailable":
            // Check if assigned resource is available
            return resourceStatus[task.resourceId] !== "occupied";

          case "previousTaskComplete":
            // Find tasks that have this task as nextTaskId
            const previousTasks = Object.values(allTasks).filter(
              (t) => t.nextTaskId === task.id
            );
            // All previous tasks must be completed
            return (
              previousTasks.length === 0 ||
              previousTasks.every((t) => t.status === "completed")
            );

          case "customCondition":
            if (task.customCondition) {
              try {
                const evaluateCondition = (condition, context) => {
                  const { task, allTasks, resourceStatus } = context;

                  const allowedOperations = {
                    checkStatus: (taskId) => allTasks[taskId]?.status,
                    checkResource: (resourceId) => resourceStatus[resourceId],
                    isCompleted: (taskId) =>
                      allTasks[taskId]?.status === "completed",
                  };

                  return Boolean(condition);
                };

                return evaluateCondition(task.customCondition, {
                  task,
                  allTasks,
                  resourceStatus,
                });
              } catch (error) {
                console.warn("Custom condition evaluation failed:", error);
                return false;
              }
            }
            return true;

          default:
            console.warn(`Unknown trigger condition: ${condition}`);
            return true;
        }
      })
    );

    // All conditions must be met
    return results.every((result) => result === true);
  } catch (error) {
    console.error("Error validating trigger conditions:", error);
    return false;
  }
};

/**
 * Safe evaluation of custom condition
 * @param {string} code - Custom condition code
 * @param {Object} context - Context object
 * @returns {any} - Evaluated result
 */
export const safeEval = (code, context) => {
  try {
    return code.replace(/\${(.*?)}/g, (_, exp) => context[exp] || "");
  } catch (error) {
    console.error("Evaluation error:", error);
    return "";
  }
};

/**
 * Validates resource allocation
 * @param {string} resourceId - Resource ID
 * @param {string} taskId - Task ID
 * @param {Object} taskProperties - Task properties
 * @param {Array} resources - All resources
 * @returns {boolean} - Whether the resource allocation is valid
 */
export const validateResourceAllocation = (
  resourceId,
  taskId,
  taskProperties,
  resources
) => {
  const resource = resources.find((r) => r.id === resourceId);
  if (!resource) return false;

  // 获取当前使用该资源的任务数量（不包括当前任务）
  const currentUsage = Object.entries(taskProperties).filter(
    ([id, task]) => id !== taskId && task.resourceId === resourceId
  ).length;

  // 如果是共享资源，检查是否超过最大共享数
  if (resource.isShared) {
    return currentUsage < (resource.maxShares || 1);
  }

  // 非共享资源，检查是否已被占用
  return currentUsage === 0;
};
