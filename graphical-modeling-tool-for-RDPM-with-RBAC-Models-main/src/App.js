import React from "react";
import { Layout, Tabs } from "antd";
import RoleManager from "./function_modules/RoleManager";
import ResourceManager from "./function_modules/ResourceManager";
import ChangePatternEditor from "./components/pattern/ChangePatternEditor";

const { Header, Content } = Layout;
const { TabPane } = Tabs;

const App = () => {
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Header style={{ color: "white", fontSize: "20px" }}>
        Role and resource management tools
      </Header>
      <Content style={{ padding: "20px" }}>
        <Tabs defaultActiveKey="1" type="card">
          <TabPane tab="Role Management" key="1">
            <RoleManager />
          </TabPane>
          <TabPane tab="Resource management" key="2">
            <ResourceManager />
          </TabPane>
          <TabPane tab="Change Patterns" key="4">
            <ChangePatternEditor />
          </TabPane>
        </Tabs>
      </Content>
    </Layout>
  );
};

export default App;
