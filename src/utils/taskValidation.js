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
