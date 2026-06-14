import { Pause, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { cn } from "@/lib/utils";

interface WaveformPlayerProps {
  src: string;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function WaveformPlayer({ src, className }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Detect dark mode from the document class (toggled by useTheme)
  const isDark =
    typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const waveColor = isDark ? "#6B6560" : "#DDD6CC";
  const progressColor = "#E07832";

  useEffect(() => {
    if (!containerRef.current) return;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor: progressColor,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 80,
      normalize: true,
    });

    wsRef.current = ws;

    ws.load(src);

    ws.on("ready", () => {
      setDuration(ws.getDuration());
      setIsReady(true);
    });

    ws.on("audioprocess", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("seeking", () => {
      setCurrentTime(ws.getCurrentTime());
    });

    ws.on("finish", () => {
      setIsPlaying(false);
    });

    ws.on("play", () => {
      setIsPlaying(true);
    });

    ws.on("pause", () => {
      setIsPlaying(false);
    });

    return () => {
      ws.destroy();
      wsRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsReady(false);
    };
  }, [src, waveColor]);

  const togglePlayPause = useCallback(() => {
    wsRef.current?.playPause();
  }, []);

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div className="rounded-lg border border-border bg-background p-4">
        {/* Waveform container */}
        <div
          ref={containerRef}
          className={cn(
            "w-full cursor-pointer rounded",
            !isReady && "flex items-center justify-center min-h-[80px]",
          )}
          data-testid="waveform-container"
        />

        {/* Controls */}
        <div className="flex items-center gap-3 mt-3">
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!isReady}
            className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
            aria-label={isPlaying ? "Pause" : "Play"}
            data-testid="waveform-play-pause"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ms-0.5" />}
          </button>
          <span className="text-sm tabular-nums text-muted-foreground select-none">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
