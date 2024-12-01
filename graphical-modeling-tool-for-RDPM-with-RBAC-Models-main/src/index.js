import React from "react";
import { createRoot } from "react-dom/client"; // 使用 createRoot 替代 ReactDOM.render
import { Provider } from "react-redux"; // Redux Provider
import store from "./store"; // Redux Store
import App from "./App";

const container = document.getElementById("root"); // 获取根节点
const root = createRoot(container); // 创建根渲染器

root.render(
  <Provider store={store}>
    <App />
  </Provider>
);
