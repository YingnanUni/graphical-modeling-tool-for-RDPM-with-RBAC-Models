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
