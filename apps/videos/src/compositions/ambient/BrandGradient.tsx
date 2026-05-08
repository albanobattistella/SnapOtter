import type React from "react";
import { AbsoluteFill } from "remotion";
import { GradientBlob } from "@/components/GradientBlob";
import { GrainOverlay } from "@/components/GrainOverlay";
import { COLOR } from "@/lib/colors";

const DURATION = 150;

const BLOBS = [
  {
    color: "#f59e0b",
    radius: 180,
    cx: 200,
    cy: 150,
    a: 2,
    b: 3,
    phaseX: 0,
    phaseY: 0,
    amplitudeX: 80,
    amplitudeY: 60,
  },
  {
    color: "#f97316",
    radius: 150,
    cx: 500,
    cy: 350,
    a: 3,
    b: 2,
    phaseX: 1.2,
    phaseY: 0.8,
    amplitudeX: 70,
    amplitudeY: 90,
  },
  {
    color: "#3b82f6",
    radius: 200,
    cx: 600,
    cy: 150,
    a: 2,
    b: 1,
    phaseX: 2.4,
    phaseY: 1.6,
    amplitudeX: 90,
    amplitudeY: 50,
  },
  {
    color: "#14b8a6",
    radius: 140,
    cx: 350,
    cy: 400,
    a: 1,
    b: 2,
    phaseX: 3.6,
    phaseY: 2.4,
    amplitudeX: 60,
    amplitudeY: 80,
  },
  {
    color: "#8b5cf6",
    radius: 160,
    cx: 150,
    cy: 350,
    a: 3,
    b: 1,
    phaseX: 4.8,
    phaseY: 3.2,
    amplitudeX: 50,
    amplitudeY: 70,
  },
];

export const BrandGradient: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: COLOR.dark, overflow: "hidden" }}>
    {BLOBS.map((blob) => (
      <GradientBlob key={blob.color} config={blob} duration={DURATION} />
    ))}
    <GrainOverlay opacity={0.04} />
  </AbsoluteFill>
);
