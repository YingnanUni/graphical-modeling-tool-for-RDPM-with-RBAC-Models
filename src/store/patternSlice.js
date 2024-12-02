import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  patterns: [],
  currentPattern: null,
  triggerConditions: [
    { id: "taskComplete", name: "Task Complete" },
    { id: "resourceAllocated", name: "Resource Allocated" },
    { id: "taskFailed", name: "Task Failed" },
  ],
  actions: [
    { id: "insert", name: "Insert Task" },
    { id: "replace", name: "Replace Task" },
    { id: "delete", name: "Delete Task" },
  ],
  relations: [
    { id: "after", name: "After" },
    { id: "before", name: "Before" },
    { id: "parallel", name: "Parallel" },
  ],
  operationTypes: [
    { id: "sequential", name: "Sequential" },
    { id: "parallel", name: "Parallel" },
    { id: "conditional", name: "Conditional" },
  ],
  tasks: {},
};

const patternSlice = createSlice({
  name: "patterns",
  initialState,
  reducers: {
    setCurrentPattern: (state, action) => {
      state.currentPattern = action.payload;
    },
    addPattern: (state, action) => {
      const newPattern = {
        id: Date.now().toString(),
        name: action.payload.name,
        xml: action.payload.xml,
        triggerCondition: action.payload.triggerCondition,
        action: action.payload.action,
        sequence: action.payload.sequence,
        roleId: action.payload.roleId,
        resourceId: action.payload.resourceId,
        conditions: action.payload.conditions || [],
        createdAt: new Date().toISOString(),
      };
      state.patterns.push(newPattern);
    },
    updatePattern: (state, action) => {
      const index = state.patterns.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        state.patterns[index] = { ...state.patterns[index], ...action.payload };
      }
    },
    deletePattern: (state, action) => {
      state.patterns = state.patterns.filter((p) => p.id !== action.payload);
    },
    updateTaskProperties: (state, action) => {
      const { patternId, taskId, properties } = action.payload;
      const pattern = state.patterns.find((p) => p.id === patternId);
      if (pattern && pattern.tasks) {
        pattern.tasks[taskId] = {
          ...pattern.tasks[taskId],
          ...properties,
        };
      }
    },
    addDynamicTask: (state, action) => {
      const { patternId, task } = action.payload;
      const pattern = state.patterns.find((p) => p.id === patternId);
      if (pattern) {
        if (!pattern.tasks) pattern.tasks = {};
        pattern.tasks[task.id] = task;
      }
    },
    removeDynamicTask: (state, action) => {
      const { patternId, taskId } = action.payload;
      const pattern = state.patterns.find((p) => p.id === patternId);
      if (pattern && pattern.tasks) {
        delete pattern.tasks[taskId];
      }
    },
    setTasks(state, action) {
      state.tasks = action.payload;
    },
    updateTask(state, action) {
      const { id, changes } = action.payload;
      state.tasks[id] = { ...state.tasks[id], ...changes };
    },
    deleteTask(state, action) {
      delete state.tasks[action.payload];
    },
  },
});

export const {
  setCurrentPattern,
  addPattern,
  updatePattern,
  deletePattern,
  updateTaskProperties,
  addDynamicTask,
  removeDynamicTask,
  setTasks,
  updateTask,
  deleteTask,
} = patternSlice.actions;
export const selectPatterns = (state) => state.patterns.patterns;
export const selectCurrentPattern = (state) => state.patterns.currentPattern;
export const selectTriggerConditions = (state) =>
  state.patterns.triggerConditions;
export const selectActions = (state) => state.patterns.actions;
export const selectRelations = (state) => state.patterns.relations;
export const selectOperationTypes = (state) => state.patterns.operationTypes;
export const selectTasks = (state) => state.patterns.tasks;

export default patternSlice.reducer;
