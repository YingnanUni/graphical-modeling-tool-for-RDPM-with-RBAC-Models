export class AuthorizationService {
  // 检查资源是否可用于分配
  static isResourceAvailable(resourceId, excludeTaskId, taskProperties) {
    // 如果taskProperties为空，则资源可用
    if (!taskProperties) return true;

    // 检查资源是否已被其他任务占用
    const isUsedInOtherTasks = Object.entries(taskProperties).some(
      ([taskId, task]) => {
        // 跳过当前任务
        if (taskId === excludeTaskId) return false;

        // 检查1:1和1:n分配
        if (Array.isArray(task.resourceId)) {
          return task.resourceId.includes(resourceId);
        } else if (task.resourceId === resourceId) {
          return true;
        }

        // 检查n:n分配
        if (task.roleResources) {
          return Object.values(task.roleResources).some(
            (resources) =>
              Array.isArray(resources) && resources.includes(resourceId)
          );
        }

        return false;
      }
    );

    // 如果资源未被其他任务使用，或者是当前任务正在使用的资源，则可用
    const currentTask = taskProperties[excludeTaskId];
    if (currentTask) {
      // 检查当前任务是否正在使用该资源
      if (Array.isArray(currentTask.resourceId)) {
        if (currentTask.resourceId.includes(resourceId)) return true;
      } else if (currentTask.resourceId === resourceId) {
        return true;
      }

      // 检查当前任务的角色资源分配
      if (currentTask.roleResources) {
        const isUsedInCurrentTask = Object.values(
          currentTask.roleResources
        ).some(
          (resources) =>
            Array.isArray(resources) && resources.includes(resourceId)
        );
        if (isUsedInCurrentTask) return true;
      }
    }

    return !isUsedInOtherTasks;
  }

  // 验证资源分配
  static validateResourceAllocation(
    taskId,
    roleId,
    resourceId,
    taskProperties,
    resources
  ) {
    // 基础验证
    if (!taskId || !resourceId) {
      return { isValid: false, message: "Missing required parameters" };
    }

    // 检查资源是否存在
    const resource = resources?.find((r) => r.id === resourceId);
    if (!resource) {
      return { isValid: false, message: "Resource does not exist" };
    }

    // 检查资源是否可用
    const isAvailable = this.isResourceAvailable(
      resourceId,
      taskId,
      taskProperties
    );

    // 如果是共享资源，检查共享限制
    if (resource.isShared) {
      const currentShares = this.countResourceShares(
        resourceId,
        taskProperties
      );
      if (currentShares >= (resource.maxShares || 1)) {
        return { isValid: false, message: "Resource sharing limit reached" };
      }
      return { isValid: true };
    }

    // 非共享资源的可用性判断
    return {
      isValid: isAvailable,
      message: isAvailable
        ? ""
        : "Resource is already occupied by another task",
    };
  }

  // 计算资源当前共享数量
  static countResourceShares(resourceId, taskProperties) {
    if (!taskProperties) return 0;

    return Object.values(taskProperties).reduce((count, task) => {
      // 检查直接分配的资源
      if (Array.isArray(task.resourceId)) {
        if (task.resourceId.includes(resourceId)) count++;
      } else if (task.resourceId === resourceId) {
        count++;
      }

      // 检查角色资源分配
      if (task.roleResources) {
        Object.values(task.roleResources).forEach((resources) => {
          if (Array.isArray(resources) && resources.includes(resourceId)) {
            count++;
          }
        });
      }
      return count;
    }, 0);
  }
}
