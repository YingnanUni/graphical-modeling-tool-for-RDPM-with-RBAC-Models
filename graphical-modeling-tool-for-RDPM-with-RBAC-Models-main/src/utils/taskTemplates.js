export const taskTemplates = {
  sequential: {
    name: "Sequential Tasks",
    tasks: {
      task1: {
        id: "task1",
        name: "First Task",
        nextTaskId: "task2",
      },
      task2: {
        id: "task2",
        name: "Second Task",
        nextTaskId: "task3",
      },
      task3: {
        id: "task3",
        name: "Final Task",
      },
    },
  },

  parallel: {
    name: "Parallel Tasks",
    tasks: {
      start: {
        id: "start",
        name: "Start Task",
        nextTasks: ["task1", "task2"],
      },
      task1: {
        id: "task1",
        name: "Parallel Task 1",
        nextTaskId: "end",
      },
      task2: {
        id: "task2",
        name: "Parallel Task 2",
        nextTaskId: "end",
      },
      end: {
        id: "end",
        name: "End Task",
      },
    },
  },
};
