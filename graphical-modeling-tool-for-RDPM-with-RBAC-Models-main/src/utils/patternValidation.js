/**
 * Validates the task chain configuration
 * @param {Object} taskProperties - Object containing task properties
 * @returns {Object} Validation result with isValid flag and error message
 */
export const validateTaskChain = (taskProperties) => {
  if (!taskProperties || Object.keys(taskProperties).length === 0) {
    return {
      isValid: false,
      message: "No tasks defined in the pattern",
    };
  }

  const tasks = Object.values(taskProperties);
  const errors = [];

  // Check for isolated tasks
  tasks.forEach((task) => {
    const hasIncoming = tasks.some((t) => t.nextTaskId === task.id);
    const hasOutgoing = task.nextTaskId || task.isEndTask;

    if (!hasIncoming && !hasOutgoing) {
      errors.push(`Task "${task.name}" is isolated`);
    }
  });

  // Check for circular references
  const visited = new Set();
  const checkCircular = (taskId, path = new Set()) => {
    if (path.has(taskId)) {
      errors.push("Circular dependency detected in task chain");
      return;
    }
    if (visited.has(taskId) || !taskProperties[taskId]) return;

    visited.add(taskId);
    path.add(taskId);

    if (taskProperties[taskId].nextTaskId) {
      checkCircular(taskProperties[taskId].nextTaskId, new Set(path));
    }
  };

  const startTasks = tasks.filter(
    (task) => !tasks.some((t) => t.nextTaskId === task.id)
  );
  startTasks.forEach((task) => checkCircular(task.id));

  return {
    isValid: errors.length === 0,
    message: errors.join("; "),
  };
};

// Add new validation functions
export const validateTaskChainTopology = (tasks) => {
  // Check for cycles
  const visited = new Set();
  const recursionStack = new Set();

  const hasCycle = (taskId) => {
    if (recursionStack.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recursionStack.add(taskId);

    const nextTaskId = tasks[taskId].nextTaskId;
    if (nextTaskId && hasCycle(nextTaskId)) {
      return true;
    }

    recursionStack.delete(taskId);
    return false;
  };

  // Validate each task
  for (const taskId in tasks) {
    if (hasCycle(taskId)) {
      return {
        isValid: false,
        message: "Circular dependency detected in task chain",
      };
    }
  }

  return {
    isValid: true,
  };
};

// Add resource validation
export const validateTaskResources = (task, resources) => {
  const resource = resources.find((r) => r.id === task.resourceId);

  if (!resource) {
    return {
      isValid: false,
      message: `Invalid resource reference for task ${task.name}`,
    };
  }

  if (resource.status === "occupied") {
    return {
      isValid: false,
      message: `Resource ${resource.name} is currently occupied`,
    };
  }

  return { isValid: true };
};
