import { createSlice } from "@reduxjs/toolkit";

const roleResourceSlice = createSlice({
  name: "roleResource",
  initialState: {},
  reducers: {
    assignResourceToRole: (state, action) => {
      const { roleId, resourceId } = action.payload;
      if (!state[roleId]) {
        state[roleId] = [];
      }
      if (!state[roleId].includes(resourceId)) {
        state[roleId].push(resourceId);
      }
    },
    removeResourceFromRole: (state, action) => {
      const { roleId, resourceId } = action.payload;
      if (state[roleId]) {
        state[roleId] = state[roleId].filter((id) => id !== resourceId);
      }
    },
    // 批量添加资源到角色
    batchAssignResources: (state, action) => {
      const { roleId, resourceIds } = action.payload;
      state[roleId] = [...new Set([...(state[roleId] || []), ...resourceIds])];
    },
  },
});

export const {
  assignResourceToRole,
  removeResourceFromRole,
  batchAssignResources,
} = roleResourceSlice.actions;

export const selectRoleResources = (state) => state.roleResource;
export default roleResourceSlice.reducer;
