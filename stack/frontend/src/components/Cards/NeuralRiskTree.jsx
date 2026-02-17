import React, { useState } from "react";
import ReactFlow, { Handle, Position } from "reactflow";
import "reactflow/dist/style.css";

/* ================= NODE COMPONENTS ================= */

// Small nodes: exactly ONE input + ONE output
const SingleNode = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...data.style,
        border: isHovered ? "2px solid #ffae00" : "1px solid #2c3445",
        boxShadow: isHovered
          ? "0 0 32px rgba(255,174,0,0.4)"
          : "0 0 24px rgba(107,228,255,0.08)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ padding: "12px", color: "#fff" }}>
        <div style={{ fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>
          {data.label}
        </div>
        <div style={{ fontSize: "10px", color: "#9aa4b2" }}>
          {data.description}
        </div>
      </div>
      <Handle type="target" position={Position.Left} id="in" style={{ background: "#ffae00" }} />
      <Handle type="source" position={Position.Right} id="out" style={{ background: "#ffae00" }} />
    </div>
  );
};

// Large node: SIX fixed connection stops
const HubNode = ({ data }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...data.style,
        border: isHovered ? "2px solid #ffae00" : "1px solid #2c3445",
        boxShadow: isHovered
          ? "0 0 40px rgba(255,174,0,0.5)"
          : "0 0 32px rgba(107,228,255,0.12)",
        transition: "all 0.3s ease",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{ padding: "16px", color: "#fff", textAlign: "center" }}>
        <div style={{ fontSize: "14px", fontWeight: "700", marginBottom: "6px" }}>
          {data.label}
        </div>
        <div style={{ fontSize: "11px", color: "#9aa4b2" }}>
          {data.description}
        </div>
      </div>
      {/* LEFT SIDE – 3 gateways */}
      <Handle id="l1" type="target" position={Position.Left} style={{ top: "25%", background: "#ffae00" }} />
      <Handle id="l2" type="target" position={Position.Left} style={{ top: "50%", background: "#ffae00" }} />
      <Handle id="l3" type="target" position={Position.Left} style={{ top: "75%", background: "#ffae00" }} />

      {/* RIGHT SIDE – 3 gateways */}
      <Handle id="r1" type="source" position={Position.Right} style={{ top: "25%", background: "#ffae00" }} />
      <Handle id="r2" type="source" position={Position.Right} style={{ top: "50%", background: "#ffae00" }} />
      <Handle id="r3" type="source" position={Position.Right} style={{ top: "75%", background: "#ffae00" }} />
    </div>
  );
};

/* ================= NODE TYPES ================= */

const nodeTypes = {
  single: SingleNode,
  hub: HubNode,
};

/* ================= MAIN COMPONENT ================= */

export default function NeuralRiskTree() {

  const animatedEdge = {
    stroke: "#ffae00",
    strokeWidth: 2,
    strokeDasharray: "6 6",
  };

  const solidEdge = {
    stroke: "#ffae00",
    strokeWidth: 2,
  };

  const nodes = [
    { id: "n1", position: { x: 40, y: 60 }, type: "single", data: { style: nodeStyle, label: "Bank Transaction logs", description: "Risk score" } },
    { id: "n2", position: { x: 90, y: 240 }, type: "single", data: { style: nodeStyle, label: "Stock Market Trends", description: "Sector index" } },
    { id: "n3", position: { x: 30, y: 450 }, type: "single", data: { style: nodeStyle, label: "Fake UPI & Anomaly Detection", description: "Check" } },

    { id: "n4", position: { x: 750, y: 500 }, type: "single", data: { style: nodeStyle, label: "Msme Loan Defult", description: "Risk" } },

    { id: "n5", position: { x: 400, y: 200 }, type: "hub", data: { style: nodeStyleLarge, label: "Ensemble Risk", description: "Core Processing" } },

    { id: "n6", position: { x: 860, y: 80 }, type: "single", data: { style: nodeStyle, label: "Owner Stress Absorption", description: "Recovery" } },
    { id: "n7", position: { x: 1000, y: 300 }, type: "single", data: { style: nodeStyle, label: "GST Text ", description: "Summary" } },

  ];
  const edges = [
    {
      id: "e1",
      source: "n1",
      sourceHandle: "out",
      target: "n5",
      targetHandle: "l1",
      type: "bezier",
      animated: true,
      style: animatedEdge,
    },
    {
      id: "e2",
      source: "n2",
      sourceHandle: "out",
      target: "n5",
      targetHandle: "l2",
      type: "bezier",
      animated: true,
      style: animatedEdge,
    },
    {
      id: "e3",
      source: "n3",
      sourceHandle: "out",
      target: "n5",
      targetHandle: "l3",
      type: "bezier",
      style: solidEdge,
    },
    {
      id: "e4",
      source: "n5",
      sourceHandle: "r3",
      target: "n4",
      targetHandle: "in",
      type: "bezier",
      animated: true,
      style: animatedEdge,
    },
    {
      id: "e5",
      source: "n5",
      sourceHandle: "r1",
      target: "n6",
      targetHandle: "in",
      type: "bezier",
      animated: true,
      style: animatedEdge,
    },
    {
      id: "e6",
      source: "n5",
      sourceHandle: "r2",
      target: "n7",
      targetHandle: "in",
      type: "bezier",
      style: solidEdge,
    },
  ];

  return (
    <div style={canvasStyle} className="neural-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        proOptions={{ hideAttribution: true }}
      />
      <style>{`
        .neural-canvas .react-flow__pane {
          cursor: default !important;
          pointer-events: none !important;
        }
        .neural-canvas .react-flow__node {
          cursor: pointer !important;
          pointer-events: auto !important;
        }
      `}</style>
    </div>
  );
}

/* ================= STYLES ================= */

const canvasStyle = {
  width: "100%",
  height: "600px",
  background: "#000000",
  borderRadius: "16px",
};

const nodeStyle = {
  width: 170,
  height: 80,
  background: "#1e2430",
  borderRadius: "14px",
  border: "1px solid #2c3445",
  boxShadow: "0 0 24px rgba(107,228,255,0.08)",
  cursor: "pointer",
};

const nodeStyleLarge = {
  width: 230,
  height: 120,
  background: "#1e2430",
  borderRadius: "18px",
  border: "1px solid #2c3445",
  boxShadow: "0 0 32px rgba(107,228,255,0.12)",
  cursor: "pointer",
};

const nodeStyleLight = {
  width: 200,
  height: 80,
  background: "#bfbfbf",
  borderRadius: "14px",
};

const dashedEdge = {
  stroke: "#6be4ff",
  strokeWidth: 2,
  strokeDasharray: "6 6",
  filter: "drop-shadow(0 0 6px rgba(107,228,255,0.7))",
};

const solidEdge = {
  stroke: "#9aa4b2",
  strokeWidth: 1.5,
};
