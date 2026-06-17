import { ImportExport, Message } from "@mui/icons-material";
import React, { memo } from "react";

import { Handle } from "react-flow-renderer";

export default memo(({ data, isConnectable }) => {
  const typeCondition = (value) => {
    if(value === 1){
      return '=='
    }
    if(value === 2){
      return '>='
    }
    if(value === 3){
      return '<='
    }
    if(value === 4){
      return '<'
    }
    if(value === 5){
      return '>'
    }
  }
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
        width: 200,
      }}
    >
      <Handle
        type="target"
        position="left"
        style={{
          background: "#6366F1",
          width: "18px",
          height: "18px",
          left: "-12px",
          top: "20px",
          cursor: "pointer",
        }}
        onConnect={(params) => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      />
      <div
        style={{
          color: "#111827",
          fontSize: "14px",
          fontWeight: 700,
          flexDirection: "row",
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingRight: 44,
        }}
      >
        <ImportExport sx={{ width: "16px", height: "16px", color: "#6366F1" }} />
        <div style={{ color: "#111827", fontSize: "14px", fontWeight: 700 }}>
          Condição
        </div>
      </div>
      <div style={{ color: "#374151", fontSize: "12px" }}>{data.key}</div>
      <div style={{ color: "#374151", fontSize: "12px" }}>{typeCondition(data.condition)}</div>
      <div style={{ color: "#374151", fontSize: "12px" }}>{data.value}</div>
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          top: 12,
          background: "#6366F1",
          width: "18px",
          height: "18px",
          right: "-11px",
          cursor: "pointer",
        }}
        isConnectable={isConnectable}
      />
      <Handle
        type="source"
        position="right"
        id="b"
        style={{
          bottom: 12,
          top: "auto",
          background: "#6366F1",
          width: "18px",
          height: "18px",
          right: "-11px",
          cursor: "pointer",
        }}
        isConnectable={isConnectable}
      />
    </div>
  );
});
