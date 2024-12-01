import { configureStore } from "@reduxjs/toolkit";
import roleReducer from "./roleSlice";
import resourceReducer from "./resourceSlice";
import patternReducer from "./patternSlice";

const store = configureStore({
  reducer: {
    roles: roleReducer,
    resources: resourceReducer,
    patterns: patternReducer,
  },
});

export default store;
