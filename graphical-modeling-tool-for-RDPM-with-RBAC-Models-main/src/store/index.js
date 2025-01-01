import { configureStore } from "@reduxjs/toolkit";
import roleReducer from "./roleSlice";
import resourceReducer from "./resourceSlice";
import patternReducer from "./patternSlice";
import roleResourceReducer from "./roleResourceSlice";

export const store = configureStore({
  reducer: {
    roles: roleReducer,
    resources: resourceReducer,
    patterns: patternReducer,
    roleResource: roleResourceReducer,
  },
});

export default store;
