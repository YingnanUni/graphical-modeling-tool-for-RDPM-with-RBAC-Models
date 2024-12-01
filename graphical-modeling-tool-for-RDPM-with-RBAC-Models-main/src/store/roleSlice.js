import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  roles: [],
};

const roleSlice = createSlice({
  name: "roles",
  initialState,
  reducers: {
    setRoles(state, action) {
      state.roles = action.payload;
    },
    addRole(state, action) {
      state.roles.push(action.payload);
    },
    deleteRole(state, action) {
      state.roles = state.roles.filter((role) => role.id !== action.payload);
    },
    updateRole(state, action) {
      const { id, changes } = action.payload;
      const roleIndex = state.roles.findIndex((role) => role.id === id);
      if (roleIndex !== -1) {
        state.roles[roleIndex] = { ...state.roles[roleIndex], ...changes };
      }
    },
  },
});

export const selectRoles = (state) => state.roles.roles;

export const { setRoles, addRole, deleteRole, updateRole } = roleSlice.actions;
export default roleSlice.reducer;
