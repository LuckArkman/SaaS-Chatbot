import { ContentCopy, Delete, Message, MicNone } from "@mui/icons-material";
import React, { memo } from "react";

import { Handle } from "react-flow-renderer";
import { useNodeStorage } from "../../../stores/useNodeStorage";

export default memo(({ data, isConnectable, id }) => {
  const link =
    process.env.REACT_APP_BACKEND_URL === "https://localhost:8090"
      ? "https://localhost:8090"
      : process.env.REACT_APP_BACKEND_URL;

  const storageItems = useNodeStorage();
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        boxShadow: "0 8px 24px rgba(16, 24, 40, 0.08)",
        width: 240,
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
        onConnect={params => console.log("handle onConnect", params)}
        isConnectable={isConnectable}
      />
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 5,
          top: 5,
          cursor: "pointer",
          gap: 6
        }}
      >
        <ContentCopy
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("duplicate");
          }}
          sx={{ width: "12px", height: "12px", color: "#6b7280" }}
        />

        <Delete
          onClick={() => {
            storageItems.setNodesStorage(id);
            storageItems.setAct("delete");
          }}
          sx={{ width: "12px", height: "12px", color: "#6b7280" }}
        />
      </div>
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
        <MicNone
          sx={{
            width: "16px",
            height: "16px",
            marginRight: "4px",
            color: "#6366F1"
          }}
        />
        <div style={{ color: "#111827", fontSize: "14px", fontWeight: 700 }}>
          Áudio
        </div>
      </div>
      <div style={{ color: "#374151", fontSize: "12px" }}>
        <div style={{ position: "absolute", right: "50px", top: "12px" }}>
          {data.record && data.record ? (
            <div>Gravado na hora</div>
          ) : (
            <div>Audio enviado</div>
          )}
        </div>
        <audio controls="controls">
          <source src={`${link}/public/${data.url}`} type="audio/mp3" />
          seu navegador não suporta HTML5
        </audio>
      </div>
      <Handle
        type="source"
        position="right"
        id="a"
        style={{
          background: "#6366F1",
          width: "18px",
          height: "18px",
          right: "-11px",
          top: "70%",
          cursor: "pointer",
        }}
        isConnectable={isConnectable}
      />
    </div>
  );
});
