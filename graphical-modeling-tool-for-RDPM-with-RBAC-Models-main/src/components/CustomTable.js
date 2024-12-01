import React from "react";
import { Table } from "antd";

const CustomTable = ({ data, columns, rowSelection }) => {
  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      rowSelection={rowSelection}
    />
  );
};

export default CustomTable;
