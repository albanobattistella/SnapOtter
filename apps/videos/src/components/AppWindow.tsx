import type React from "react";

const TRAFFIC_LIGHTS = [
  { color: "#ff5f57", border: "#e0443e" },
  { color: "#febc2e", border: "#dea123" },
  { color: "#28c840", border: "#1aab29" },
];

export const AppWindow: React.FC<{
  children: React.ReactNode;
  title?: string;
  width: number;
  height: number;
  topBarColor?: string;
  bodyColor?: string;
  style?: React.CSSProperties;
}> = ({
  children,
  title,
  width,
  height,
  topBarColor = "#1e1e2e",
  bodyColor = "#0d1117",
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <div
        style={{
          height: 36,
          backgroundColor: topBarColor,
          display: "flex",
          alignItems: "center",
          paddingLeft: 12,
          flexShrink: 0,
        }}
      >
        {TRAFFIC_LIGHTS.map((dot) => (
          <div
            key={dot.color}
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: dot.color,
              border: `1px solid ${dot.border}`,
              marginRight: 8,
            }}
          />
        ))}
        {title && (
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.5)",
              marginRight: 56,
            }}
          >
            {title}
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          backgroundColor: bodyColor,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
};
