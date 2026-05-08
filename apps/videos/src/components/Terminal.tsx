import type React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { AppWindow } from "@/components/AppWindow";
import { TypeWriter } from "@/components/TypeWriter";
import { SPRING } from "@/lib/motion";

interface OutputLine {
  text: string;
  color: string;
  delay: number;
}

export const Terminal: React.FC<{
  command: { text: string; color: string }[];
  commandStartFrame: number;
  commandSpeed?: number;
  outputLines?: OutputLine[];
  outputStartFrame: number;
  outputStagger?: number;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  enterFrame?: number;
}> = ({
  command,
  commandStartFrame,
  commandSpeed = 2,
  outputLines = [],
  outputStartFrame,
  outputStagger = 3,
  width = 800,
  height = 450,
  style,
  enterFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterProgress = spring({
    frame: frame - enterFrame,
    fps,
    config: SPRING.snappy,
  });

  const translateY = interpolate(enterProgress, [0, 1], [height + 50, 0]);
  const opacity = interpolate(enterProgress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `translateY(${translateY}px)`,
        opacity,
        ...style,
      }}
    >
      <AppWindow title="Terminal" width={width} height={height}>
        <div style={{ padding: "16px 20px" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ color: "#8b949e", fontSize: 16, fontFamily: "monospace" }}>$ </span>
            <TypeWriter
              segments={command}
              startFrame={commandStartFrame}
              speed={commandSpeed}
              style={{ fontSize: 16 }}
            />
          </div>

          {outputLines.map((line, i) => {
            const lineFrame = outputStartFrame + i * outputStagger;
            const lineOpacity = interpolate(frame, [lineFrame, lineFrame + 6], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });

            return (
              <div
                key={`${line.text}-${i}`}
                style={{
                  marginTop: i === 0 ? 12 : 4,
                  fontSize: 16,
                  fontFamily: "monospace",
                  color: line.color,
                  opacity: lineOpacity,
                }}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </AppWindow>
    </div>
  );
};
