import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  resources: [
    {
      id: "1",
      name: "Resource 1",
      type: "Type A",
      status: "available",
    },
    // ... 其他资源
  ],
};

const resourceSlice = createSlice({
  name: "resources",
  initialState,
  reducers: {
    addResource: (state, action) => {
      state.resources.push({
        ...action.payload,
        status: "available",
        createdAt: Date.now(),
      });
    },
    deleteResource: (state, action) => {
      state.resources = state.resources.filter((r) => r.id !== action.payload);
    },
    updateResource: (state, action) => {
      const index = state.resources.findIndex(
        (r) => r.id === action.payload.id
      );
      if (index !== -1) {
        state.resources[index] = {
          ...state.resources[index],
          ...action.payload,
          updatedAt: Date.now(),
        };
      }
    },
    updateResourceStatus: (state, action) => {
      const { id, status } = action.payload;
      const resource = state.resources.find((r) => r.id === id);
      if (resource) {
        resource.status = status;
      }
    },
    updateResourceAllocation: (state, action) => {
      const { resourceId, taskId, roleId } = action.payload;
      if (!state.allocations[resourceId]) {
        state.allocations[resourceId] = [];
      }
      state.allocations[resourceId].push({ taskId, roleId });

      // 更新共享计数
      state.sharingCounts[resourceId] =
        (state.sharingCounts[resourceId] || 0) + 1;
    },
    releaseResource: (state, action) => {
      const { resourceId, taskId } = action.payload;
      state.allocations[resourceId] = state.allocations[resourceId]?.filter(
        (allocation) => allocation.taskId !== taskId
      );

      // 更新共享计数
      if (state.sharingCounts[resourceId] > 0) {
        state.sharingCounts[resourceId]--;
      }
    },
  },
});

export const {
  addResource,
  deleteResource,
  updateResource,
  updateResourceStatus,
} = resourceSlice.actions;
export const selectResources = (state) => state.resources.resources;
export default resourceSlice.reducer;
