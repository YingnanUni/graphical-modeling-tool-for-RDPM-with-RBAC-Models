import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  resources: [],
};

const resourceSlice = createSlice({
  name: "resources",
  initialState,
  reducers: {
    addResource: (state, action) => {
      state.resources.push(action.payload);
    },
    deleteResource: (state, action) => {
      state.resources = state.resources.filter(
        (r) => r.name !== action.payload
      );
    },
    updateResourceStatus: (state, action) => {
      const { name, status } = action.payload;
      const resource = state.resources.find((r) => r.name === name);
      if (resource) {
        resource.status = status;
      }
    },
  },
});

export const { addResource, deleteResource, updateResourceStatus } =
  resourceSlice.actions;
export const selectResources = (state) => state.resources.resources;
export default resourceSlice.reducer;
