import type React from "react";
import { AbsoluteFill, Series } from "remotion";
import { GrainOverlay } from "@/components/GrainOverlay";
import { COLOR } from "@/lib/colors";
import { AiShowcaseScene } from "./scenes/AiShowcaseScene";
import { FeatureBurstScene } from "./scenes/FeatureBurstScene";
import { GitHubCTAScene } from "./scenes/GitHubCTAScene";
import { HookScene } from "./scenes/HookScene";
import { PrivacyBeatScene } from "./scenes/PrivacyBeatScene";
import { TerminalInstallScene } from "./scenes/TerminalInstallScene";
import { ToolGridRevealScene } from "./scenes/ToolGridRevealScene";

export const XLaunchVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: COLOR.dark }}>
      <Series>
        <Series.Sequence durationInFrames={120}>
          <HookScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <TerminalInstallScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <ToolGridRevealScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={180}>
          <AiShowcaseScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={120}>
          <PrivacyBeatScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <FeatureBurstScene />
        </Series.Sequence>
        <Series.Sequence durationInFrames={150}>
          <GitHubCTAScene />
        </Series.Sequence>
      </Series>

      <GrainOverlay opacity={0.03} />
    </AbsoluteFill>
  );
};
