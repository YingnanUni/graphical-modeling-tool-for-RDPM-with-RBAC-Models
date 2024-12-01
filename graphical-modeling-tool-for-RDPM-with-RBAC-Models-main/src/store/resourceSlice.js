import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  resources: [],
};

const resourceSlice = createSlice({
  name: "resources",
  initialState,
  reducers: {
    setResources(state, action) {
      state.resources = action.payload;
    },
    addResource(state, action) {
      state.resources.push(action.payload);
    },
    deleteResource(state, action) {
      state.resources = state.resources.filter(
        (resource) => resource.name !== action.payload
      );
    },
    updateResource(state, action) {
      const { id, changes } = action.payload;
      const resource = state.resources.find((res) => res.id === id);
      if (resource) {
        Object.assign(resource, changes);
      }
    },
  },
});

export const selectResources = (state) => state.resources.resources;

export const { setResources, addResource, deleteResource, updateResource } =
  resourceSlice.actions;
export default resourceSlice.reducer;
